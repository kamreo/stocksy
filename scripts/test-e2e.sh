#!/bin/sh
set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(dirname -- "$script_directory")
test_project_name="stocksy-e2e-$(date +%s)-$$"

compose() {
    docker compose --file "$repository_root/docker-compose.yml" --project-name "$test_project_name" "$@"
}

cleanup() {
    exit_code=$?
    trap - EXIT INT TERM
    printf '\nRemoving test containers and database volume: %s\n' "$test_project_name"
    if compose down --volumes --remove-orphans; then
        :
    else
        cleanup_exit_code=$?
        printf 'Cleanup failed. Remove the remaining test environment: %s\n' "$test_project_name" >&2
        if [ "$exit_code" -eq 0 ]; then exit_code=$cleanup_exit_code; fi
    fi
    exit "$exit_code"
}

command -v docker >/dev/null
docker compose version
docker info --format '{{.ServerVersion}}'

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf 'Starting isolated E2E environment: %s\n' "$test_project_name"

printf '\nBuilding the test image...\n'
compose build backend

printf '\nStarting a fresh PostgreSQL database...\n'
compose up -d --wait db

printf '\nGenerating the Prisma client...\n'
compose run --rm --no-deps backend pnpm exec prisma generate

printf '\nApplying migrations to the test database...\n'
compose run --rm --no-deps backend pnpm exec prisma migrate deploy

printf '\nRunning backend E2E tests (live output follows)...\n'
compose run --rm --no-deps --env STOCKSY_E2E_DISPOSABLE=1 backend pnpm test:e2e
