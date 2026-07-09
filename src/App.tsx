import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Dashboard } from '@/pages/Dashboard'
import { Reports } from '@/pages/Reports'
import { Pay } from '@/pages/Pay'
import { Login } from '@/pages/Login'
import { Admin } from '@/pages/Admin'
import { useAuth } from '@/hooks/useAuth'

function App() {
  const { isAdmin, ready } = useAuth()

  return (
    <HashRouter>
      <div className="min-h-screen">
        <Header isAdmin={isAdmin} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/login" element={isAdmin ? <Navigate to="/admin" replace /> : <Login />} />
          <Route
            path="/admin"
            element={!ready ? null : isAdmin ? <Admin /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  )
}

export default App
