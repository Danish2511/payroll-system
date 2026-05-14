import { createContext, useContext, useState, useEffect } from 'react'
import { authLogin } from '../api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('token')
    const u = localStorage.getItem('user')
    if (t && u) setUser(JSON.parse(u))
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await authLogin({ email, password })
    localStorage.setItem('token', data.access_token)
    const u = { email, role: data.role, name: data.name, employee_id: data.employee_id }
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
    return u
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    window.location.href = '/login'
  }

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
