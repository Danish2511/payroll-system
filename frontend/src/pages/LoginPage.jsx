import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authSeedDemo } from '../api'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [email, setEmail]     = useState('admin@clinic.com')
  const [password, setPassword] = useState('admin123')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError]     = useState('')
  const [seedMsg, setSeedMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password. Try seeding the demo first.')
    } finally { setLoading(false) }
  }

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg('')
    try {
      const { data } = await authSeedDemo()
      setSeedMsg(`✅ ${data.message} — Email: ${data.admin_email || 'admin@clinic.com'} / Password: admin123`)
    } catch (e) {
      setSeedMsg(e.response?.data?.detail || 'Already seeded or error')
    } finally { setSeeding(false) }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* bg grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b55_1px,transparent_1px),linear-gradient(to_bottom,#1e293b55_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-slate-900/20" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-xl shadow-blue-900/50">
            <Building2 size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Supe Hospital </h1>
          <p className="text-slate-500 text-sm mt-1">Heart And Diabetes Hospital And Research Centre</p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-5">Sign in</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="admin@clinic.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* <div className="mt-5 pt-5 border-t border-slate-800">
            <p className="text-slate-600 text-xs text-center mb-3">First time? Create the demo account:</p>
            <button onClick={handleSeed} disabled={seeding}
              className="btn-secondary w-full justify-center text-xs py-2">
              {seeding ? <Loader2 size={12} className="animate-spin" /> : '🌱'}
              {seeding ? 'Setting up…' : 'Seed Demo Data'}
            </button>
            {seedMsg && <p className="text-emerald-400 text-xs mt-2 text-center">{seedMsg}</p>}
          </div> */}
        </div>

        {/* <p className="text-center text-slate-700 text-xs mt-6">
          Demo: admin@clinic.com / admin123
        </p> */}
      </div>
    </div>
  )
}
