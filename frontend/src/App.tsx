import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('...')

  useEffect(() => {
    fetch('/api')
      .then((res) => res.text())
      .then(setMessage)
      .catch(() => setMessage('backend unreachable'))
  }, [])

  return <h1>{message}</h1>
}

export default App
