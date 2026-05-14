import { Loader2 } from 'lucide-react'

export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-blue-400" />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  )
}

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`card w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   ['bg-blue-500/10',   'text-blue-400'],
    green:  ['bg-emerald-500/10','text-emerald-400'],
    yellow: ['bg-yellow-500/10', 'text-yellow-400'],
    red:    ['bg-red-500/10',    'text-red-400'],
    purple: ['bg-purple-500/10', 'text-purple-400'],
  }
  const [bg, txt] = colors[color] || colors.blue
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className={txt} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white leading-tight">{value}</div>
        <div className="text-sm text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export function MonthYearPicker({ month, year, onChange }) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return (
    <div className="flex gap-2">
      <select value={month} onChange={e => onChange(+e.target.value, year)}
        className="input w-28 text-sm">
        {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
      </select>
      <select value={year} onChange={e => onChange(month, +e.target.value)}
        className="input w-24 text-sm">
        {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
      </select>
    </div>
  )
}

export function EmptyState({ message = "No data found" }) {
  return (
    <tr>
      <td colSpan={99} className="text-center py-16 text-slate-500 text-sm">{message}</td>
    </tr>
  )
}

export function Alert({ type = 'error', message, onClose }) {
  const styles = {
    error:   'bg-red-900/30 border-red-800 text-red-400',
    success: 'bg-emerald-900/30 border-emerald-800 text-emerald-400',
    info:    'bg-blue-900/30 border-blue-800 text-blue-400',
  }
  if (!message) return null
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-center justify-between ${styles[type]}`}>
      <span>{message}</span>
      {onClose && <button onClick={onClose} className="ml-3 opacity-70 hover:opacity-100">&times;</button>}
    </div>
  )
}

export const MONTHS_FULL = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December']
export const MONTHS_ABR  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}

export function fmtCurrency(n) {
  if (n == null) return '—'
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}
