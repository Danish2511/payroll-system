import { useState, useEffect } from 'react'
import { getDashboardStats } from '../api'
import { StatCard, MonthYearPicker, PageLoader, fmtCurrency, fmt, MONTHS_ABR } from '../components/UI'
import { Users, DollarSign, CalendarCheck, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899']
const now = new Date()

const TT = ({ contentStyle: _, ...p }) => (
  <Tooltip {...p} contentStyle={{
    background:'#1e293b', border:'1px solid #334155',
    borderRadius:8, color:'#f8fafc', fontSize:12
  }} />
)

export default function Dashboard() {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    getDashboardStats(month, year)
      .then(r => setStats(r.data))
      .catch(() => setError('Could not load dashboard. Make sure the backend is running.'))
      .finally(() => setLoading(false))
  }, [month, year])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Payroll overview & analytics</p>
        </div>
        <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {loading ? <PageLoader /> : error ? (
        <div className="card p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-400" size={32} />
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Users}         label="Total Employees"     value={stats.total_employees}       color="blue"   />
            <StatCard icon={DollarSign}    label="Monthly Payroll"     value={fmtCurrency(stats.monthly_payroll)} color="green" />
            <StatCard icon={CalendarCheck} label="Attendance Rate"     value={`${stats.attendance_pct}%`} color="yellow" />
            <StatCard icon={Clock}         label="Total OT Hours"      value={fmt(stats.total_ot_hours)}  color="purple" />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Bar: net pay per employee */}
            <div className="card p-5 xl:col-span-2">
              <h3 className="text-sm font-semibold text-white mb-4">Net Pay by Employee — {MONTHS_ABR[month-1]} {year}</h3>
              {stats.breakdown?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.breakdown} margin={{ top:0, right:8, bottom:24, left:8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                    <TT formatter={v => [fmtCurrency(v),'Net Pay']} />
                    <Bar dataKey="net_pay" fill="#3b82f6" radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-600 text-sm text-center py-16">No payroll data yet for this month.</p>}
            </div>

            {/* Pie: salary distribution */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Salary Distribution</h3>
              {stats.breakdown?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats.breakdown} dataKey="net_pay" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                      labelLine={false} fontSize={9}>
                      {stats.breakdown.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <TT formatter={v => [fmtCurrency(v),'Net Pay']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-600 text-sm text-center py-16">No data</p>}
            </div>
          </div>

          {/* Monthly trend */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Monthly Payroll Trend — {year}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.monthly_trend} margin={{ top:4, right:8, bottom:0, left:8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill:'#64748b', fontSize:10 }} />
                <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <TT formatter={v => [fmtCurrency(v),'Payroll']} />
                <Line type="monotone" dataKey="payroll" stroke="#3b82f6" strokeWidth={2} dot={{ r:3, fill:'#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Employee table */}
          {stats.breakdown?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Employee Summary — {MONTHS_ABR[month-1]} {year}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Employee','Designation','Present','Absent','OT Hrs','Gross','Net Pay'].map(h => (
                        <th key={h} className="th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.breakdown.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="td font-medium">{r.name}</td>
                        <td className="td text-slate-400">{r.designation || '—'}</td>
                        <td className="td"><span className="badge-green">{r.present}</span></td>
                        <td className="td"><span className={r.absent > 0 ? 'badge-red' : 'badge-green'}>{r.absent}</span></td>
                        <td className="td text-yellow-400">{fmt(r.ot_hours)}</td>
                        <td className="td text-slate-300">{fmtCurrency(r.gross)}</td>
                        <td className="td font-semibold text-emerald-400">{fmtCurrency(r.net_pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
