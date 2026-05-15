import { useState, useEffect, useCallback } from 'react'
import {
  getReportSummary, downloadAttendanceExcel,
  downloadMonthlyExcel, triggerDownload
} from '../api'
import { Alert, MonthYearPicker, PageLoader, fmtCurrency, MONTHS_FULL, MONTHS_ABR } from '../components/UI'
import {
  FileBarChart, FileSpreadsheet, Download, RefreshCw, Loader2,
  Users, CalendarCheck, DollarSign, TrendingUp, TrendingDown, Clock
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, Legend
} from 'recharts'

const now = new Date()
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899']

const TT = (props) => (
  <Tooltip {...props} contentStyle={{
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 8, color: '#f8fafc', fontSize: 12,
  }} />
)

export default function Reports() {
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year,       setYear]       = useState(now.getFullYear())
  const [summary,    setSummary]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [attLoading, setAttLoading] = useState(false)
  const [xlsLoading, setXlsLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true); setError('')
    getReportSummary(month, year)
      .then(r => setSummary(r.data))
      .catch(() => setError('Failed to load report data. Make sure payroll is calculated first.'))
      .finally(() => setLoading(false))
  }, [month, year])

  useEffect(() => { load() }, [load])

  // ── derived stats ──────────────────────────────────────
  const totalNet      = summary.reduce((s, r) => s + r.net_pay, 0)
  const totalGross    = summary.reduce((s, r) => s + r.gross, 0)
  const totalDeduct   = summary.reduce((s, r) => s + r.advance + r.deposit + r.pf + r.less_ded, 0)
  const totalOT       = summary.reduce((s, r) => s + r.ot_hours, 0)
  const totalPresent  = summary.reduce((s, r) => s + r.present, 0)
  const totalAbsent   = summary.reduce((s, r) => s + r.absent, 0)

  // Group by department
  const byDept = summary.reduce((acc, r) => {
    const dept = r.department || 'Other'
    if (!acc[dept]) acc[dept] = { dept, net_pay: 0, count: 0 }
    acc[dept].net_pay += r.net_pay
    acc[dept].count += 1
    return acc
  }, {})
  const deptData = Object.values(byDept)

  // ── downloads ──────────────────────────────────────────
  const handleAttExcel = async () => {
    setAttLoading(true)
    try {
      const { data } = await downloadAttendanceExcel(month, year)
      triggerDownload(data, `Attendance_${MONTHS_FULL[month-1]}_${year}.xlsx`)
      setSuccess('Attendance report downloaded!')
    } catch (e) {
      setError(e.response?.data?.detail || 'Download failed')
    } finally { setAttLoading(false) }
  }

  const handlePayrollExcel = async () => {
    setXlsLoading(true)
    try {
      const { data } = await downloadMonthlyExcel(month, year)
      triggerDownload(data, `Payroll_${MONTHS_FULL[month-1]}_${year}.xlsx`)
      setSuccess('Payroll sheet downloaded!')
    } catch (e) {
      setError(e.response?.data?.detail || 'Download failed. Make sure payroll is calculated first.')
    } finally { setXlsLoading(false) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileBarChart size={20} /> Reports
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{MONTHS_FULL[month-1]} {year}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>
      </div>

      <Alert type="error"   message={error}   onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Download buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet size={22} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white text-sm">Payroll Report</div>
            <div className="text-xs text-slate-500 mt-0.5">Full salary sheet with all employees · Multi-tab Excel</div>
          </div>
          <button onClick={handlePayrollExcel} disabled={xlsLoading || summary.length === 0}
            className="btn-success flex-shrink-0">
            {xlsLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {xlsLoading ? '…' : 'Download'}
          </button>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <CalendarCheck size={22} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white text-sm">Attendance Report</div>
            <div className="text-xs text-slate-500 mt-0.5">P/A grid for all employees · Color-coded Excel</div>
          </div>
          <button onClick={handleAttExcel} disabled={attLoading}
            className="btn-primary flex-shrink-0">
            {attLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {attLoading ? '…' : 'Download'}
          </button>
        </div>
      </div>

      {loading ? <PageLoader /> : summary.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 text-sm">
          No payroll data for {MONTHS_FULL[month-1]} {year}.<br />
          <span className="text-slate-600 text-xs mt-1 block">Go to Payroll page and calculate payroll first.</span>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label:'Total Net Payroll', value: fmtCurrency(totalNet),       color:'text-emerald-400', icon: DollarSign },
              { label:'Total Gross',       value: fmtCurrency(totalGross),     color:'text-blue-400',    icon: TrendingUp },
              { label:'Total Deductions',  value: fmtCurrency(totalDeduct),    color:'text-red-400',     icon: TrendingDown },
              { label:'OT Hours',          value: totalOT.toFixed(1)+'h',      color:'text-yellow-400',  icon: Clock },
              { label:'Present Days',      value: totalPresent,                color:'text-emerald-400', icon: CalendarCheck },
              { label:'Absent Days',       value: totalAbsent,                 color:'text-red-400',     icon: Users },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="card p-4 text-center">
                <Icon size={16} className={`${color} mx-auto mb-1.5`} />
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Net pay bar chart */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Net Pay by Employee</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary} margin={{ top:0, right:8, bottom:28, left:8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                  <TT formatter={v => [fmtCurrency(v), 'Net Pay']} />
                  <Bar dataKey="net_pay" radius={[5,5,0,0]}>
                    {summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Department pie */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Payroll by Department</h3>
              {deptData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={deptData} dataKey="net_pay" nameKey="dept"
                      cx="50%" cy="50%" outerRadius={80}
                      label={({ dept, percent }) => `${dept} ${(percent*100).toFixed(0)}%`}
                      labelLine={false} fontSize={10}>
                      {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <TT formatter={v => [fmtCurrency(v), 'Net Pay']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-600 text-sm text-center py-12">No department data</p>}
            </div>
          </div>

          {/* Earnings vs Deductions */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Earnings vs Deductions per Employee</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary} margin={{ top:0, right:8, bottom:28, left:8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <TT formatter={(v, n) => [fmtCurrency(v), n]} />
                <Legend wrapperStyle={{ fontSize:11, color:'#94a3b8' }} />
                <Bar dataKey="gross"   name="Gross Pay"   fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="net_pay" name="Net Pay"     fill="#10b981" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed summary table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Detailed Payroll Summary — {MONTHS_FULL[month-1]} {year}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Employee','Designation','Dept','Present','Absent','OT Hrs','Gross','Advance','Deposit','PF','Extra Pay','Less Ded','Net Pay'].map(h => (
                      <th key={h} className="th text-center first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/40">
                      <td className="td font-medium">{r.name}</td>
                      <td className="td text-xs text-slate-400">{r.designation || '—'}</td>
                      <td className="td text-xs text-slate-400">{r.department || '—'}</td>
                      <td className="td text-center"><span className="badge-green">{r.present}</span></td>
                      <td className="td text-center"><span className={r.absent > 0 ? 'badge-red' : 'badge-green'}>{r.absent}</span></td>
                      <td className="td text-center text-yellow-400 font-mono text-xs">{r.ot_hours.toFixed(2)}h</td>
                      <td className="td text-center font-mono text-xs text-slate-300">{fmtCurrency(r.gross)}</td>
                      <td className="td text-center font-mono text-xs text-red-400">{fmtCurrency(r.advance)}</td>
                      <td className="td text-center font-mono text-xs text-red-400">{fmtCurrency(r.deposit)}</td>
                      <td className="td text-center font-mono text-xs text-red-400">{fmtCurrency(r.pf)}</td>
                      <td className="td text-center font-mono text-xs text-emerald-400">{fmtCurrency(r.extra_pay)}</td>
                      <td className="td text-center font-mono text-xs text-red-400">{fmtCurrency(r.less_ded)}</td>
                      <td className="td text-center font-bold font-mono text-emerald-400">{fmtCurrency(r.net_pay)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr className="bg-slate-800 border-t-2 border-slate-700">
                    <td colSpan={6} className="px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wide">TOTALS</td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-sm text-blue-400">{fmtCurrency(totalGross)}</td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-sm text-red-400">{fmtCurrency(summary.reduce((s,r)=>s+r.advance,0))}</td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-sm text-red-400">{fmtCurrency(summary.reduce((s,r)=>s+r.deposit,0))}</td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-sm text-red-400">{fmtCurrency(summary.reduce((s,r)=>s+r.pf,0))}</td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-sm text-emerald-400">{fmtCurrency(summary.reduce((s,r)=>s+r.extra_pay,0))}</td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-sm text-red-400">{fmtCurrency(summary.reduce((s,r)=>s+r.less_ded,0))}</td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-base text-emerald-400">{fmtCurrency(totalNet)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
