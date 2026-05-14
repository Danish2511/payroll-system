import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Sidebar from './components/Sidebar'
import LoginPage    from './pages/LoginPage'
import Dashboard    from './pages/Dashboard'
import Employees    from './pages/Employees'
// import Attendance   from './pages/Attendance'
// import Payroll      from './pages/Payroll'
// import Reports      from './pages/Reports'

function Protected({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500 text-sm">Loading…</div>
  if (!user)   return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <div className="max-w-screen-2xl mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <Protected>
              <AppLayout><Dashboard /></AppLayout>
            </Protected>
          }/>
          <Route path="/employees" element={
            <Protected roles={['admin','hr']}>
              <AppLayout><Employees /></AppLayout>
            </Protected>
          }/>
          {/* <Route path="/attendance" element={
            <Protected>
              <AppLayout><Attendance /></AppLayout>
            </Protected>
          }/>
          <Route path="/payroll" element={
            <Protected roles={['admin','hr']}>
              <AppLayout><Payroll /></AppLayout>
            </Protected>
          }/>
          <Route path="/reports" element={
            <Protected roles={['admin','hr']}>
              <AppLayout><Reports /></AppLayout>
            </Protected>
          }/> */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
