$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repositoryRoot 'docker-compose.yml'
$testProjectName = 'stocksy-e2e-' + [guid]::NewGuid().ToString('N')
$exitCode = 0

function Invoke-Compose {
    & docker compose --file $composeFile --project-name $testProjectName @args
    if ($LASTEXITCODE -ne 0) {
        $script:exitCode = $LASTEXITCODE
        throw "Docker Compose failed with exit code $LASTEXITCODE."
    }
}

Get-Command docker -ErrorAction Stop | Out-Null
& docker compose version
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting isolated E2E environment: $testProjectName"

try {
    Write-Host 'Building the test image...'
    Invoke-Compose build backend

    Write-Host 'Starting a fresh PostgreSQL database...'
    Invoke-Compose up -d --wait db

    Write-Host 'Generating the Prisma client...'
    Invoke-Compose run --rm --no-deps backend pnpm exec prisma generate

    Write-Host 'Applying migrations to the test database...'
    Invoke-Compose run --rm --no-deps backend pnpm exec prisma migrate deploy

    Write-Host 'Running backend E2E tests (live output follows)...'
    Invoke-Compose run --rm --no-deps --env STOCKSY_E2E_DISPOSABLE=1 backend pnpm test:e2e
}
catch {
    if ($exitCode -eq 0) { $exitCode = 1 }
    Write-Host "E2E run failed: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Write-Host "Removing test containers and database volume: $testProjectName"
    try {
        & docker compose --file $composeFile --project-name $testProjectName down --volumes --remove-orphans
        if ($LASTEXITCODE -ne 0) {
            if ($exitCode -eq 0) { $exitCode = $LASTEXITCODE }
            Write-Warning "Cleanup failed. Remove the remaining test environment: $testProjectName"
        }
    }
    catch {
        if ($exitCode -eq 0) { $exitCode = 1 }
        Write-Warning "Cleanup failed. Remove the remaining test environment: $testProjectName"
    }
}

exit $exitCode
