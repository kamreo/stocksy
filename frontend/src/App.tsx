import { Route, Routes } from 'react-router'
import AuthForm from './AuthForm.tsx'
import Home from './Home.tsx'
import RequireAuth from './RequireAuth.tsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Home />} />
      </Route>
    </Routes>
  )
}

export default App
