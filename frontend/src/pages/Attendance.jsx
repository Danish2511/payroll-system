import { useState, useEffect, useCallback } from 'react'
import { getEmployees, getAttendance, upsertAttendance, deleteAttendance, bulkUpload } from '../api'
import { Modal, PageLoader, Alert, EmptyState, MonthYearPicker, fmtCurrency, MONTHS_FULL } from '../components/UI'
import {
  CalendarDays, Upload, Trash2, RefreshCw, ChevronLeft,
  ChevronRight, Clock, TrendingUp, TrendingDown, User, Loader2
} from 'lucide-react'

const now = new Date()

// ── helpers ──────────────────────────────────────────────
function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}
function dayName(year, month, day) {
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short' })
}
function isSunday(year, month, day) {
  return new Date(year, month - 1, day).getDay() === 0
}
function parseHHMM(t) {
  if (!t) return null
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}
function calcHours(inT, outT, stdHours) {
  const i = parseHHMM(inT)
  const o = parseHHMM(outT)
  if (i == null || o == null) return { total: 0, diff: 0, ot: 0, less: 0 }

  // Overnight shift: out < in means shift crosses midnight
  // e.g. in=20:00(1200), out=08:00(480) → 480 < 1200 → overnight
  const isOvernight = o < i
  const trueMins    = isOvernight ? (24 * 60 - i) + o : o - i
  const trueHours   = trueMins / 60

  // Cap overnight shifts at stdHours for payroll — no phantom OT
  // e.g. 20:00→08:00 = 12 physical hrs, but 8h std = 8 payroll hrs, OT = 0
  const total = isOvernight ? Math.min(trueHours, stdHours) : trueHours
  const diff  = total - stdHours
  return {
    total:       total.toFixed(2),
    diff:        diff.toFixed(2),
    ot:          diff > 0 ? diff.toFixed(2) : '0.00',
    less:        diff < 0 ? (-diff).toFixed(2) : '0.00',
    isOvernight,
  }
}

// ── Day row in the attendance table ──────────────────────
function DayRow({ day, month, year, record, stdHours, onSave, onDelete, saving }) {
  const [inTime,  setInTime]  = useState(record?.in_time  || '')
  const [outTime, setOutTime] = useState(record?.out_time || '')
  const [outHrs,  setOutHrs]  = useState(record?.out_hours || 0)
  const [dirty,   setDirty]   = useState(false)
  const [rowSaving, setRowSaving] = useState(false)

  useEffect(() => {
    setInTime(record?.in_time  || '')
    setOutTime(record?.out_time || '')
    setOutHrs(record?.out_hours || 0)
    setDirty(false)
  }, [record])

  const calc  = calcHours(inTime, outTime, stdHours)
  const isSun = isSunday(year, month, day)
  const dayNm = dayName(year, month, day)
  const present = inTime && outTime && parseFloat(calc.total) > 0

  const handleSave = async () => {
    setRowSaving(true)
    try {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      await onSave({ date: dateStr, in_time: inTime || null, out_time: outTime || null, out_hours: parseFloat(outHrs) || 0 })
      setDirty(false)
    } finally { setRowSaving(false) }
  }

  const rowBg = isSun
    ? 'bg-yellow-900/10 hover:bg-yellow-900/20'
    : present
      ? 'hover:bg-slate-800/30'
      : 'hover:bg-slate-800/20'

  return (
    <tr className={`transition-colors border-b border-slate-800/40 ${rowBg}`}>
      <td className="px-3 py-2 text-xs font-mono text-slate-400 w-10">{String(day).padStart(2,'0')}</td>
      <td className="px-3 py-2 text-xs w-12">
        <span className={`font-medium ${isSun ? 'text-yellow-400' : 'text-slate-500'}`}>{dayNm}</span>
      </td>
      <td className="px-3 py-2 w-8">
        {isSun
          ? <span className="badge-yellow text-xs">H</span>
          : present
            ? calc.isOvernight
              ? <span className="badge-blue text-xs">🌙 N</span>
              : <span className="badge-green text-xs">P</span>
            : <span className="badge-red text-xs">A</span>
        }
      </td>
      <td className="px-3 py-1.5 w-28">
        <input
          type="time"
          value={inTime}
          onChange={e => { setInTime(e.target.value); setDirty(true) }}
          className="input py-1 text-xs font-mono"
        />
      </td>
      <td className="px-3 py-1.5 w-28">
        <input
          type="time"
          value={outTime}
          onChange={e => { setOutTime(e.target.value); setDirty(true) }}
          className="input py-1 text-xs font-mono"
        />
      </td>
      <td className="px-3 py-2 text-xs font-mono text-slate-300 w-20 text-center">
        {present ? calc.total : '—'}
      </td>
      <td className="px-3 py-2 text-xs font-mono w-20 text-center">
        {calc.isOvernight && parseFloat(calc.ot) === 0 && parseFloat(calc.less) === 0
          ? <span className="text-purple-400">Night</span>
          : parseFloat(calc.diff) > 0
          ? <span className="text-emerald-400">+{calc.ot}h</span>
          : parseFloat(calc.less) > 0
            ? <span className="text-red-400">-{calc.less}h</span>
            : <span className="text-slate-600">0</span>
        }
      </td>
      <td className="px-3 py-1.5 w-20">
        <input
          type="number" step="0.5" min="0" max="24"
          value={outHrs}
          onChange={e => { setOutHrs(e.target.value); setDirty(true) }}
          className="input py-1 text-xs font-mono w-20 text-center"
          placeholder="0"
        />
      </td>
      <td className="px-3 py-2 w-24">
        <div className="flex gap-1.5">
          {dirty && (
            <button onClick={handleSave} disabled={rowSaving}
              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1">
              {rowSaving ? <Loader2 size={10} className="animate-spin" /> : null}
              {rowSaving ? '…' : 'Save'}
            </button>
          )}
          {record?.id && (
            <button onClick={() => onDelete(record.id)}
              className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────
export default function Attendance() {
  const [employees,   setEmployees]   = useState([])
  const [selEmpId,    setSelEmpId]    = useState('')
  const [month,       setMonth]       = useState(now.getMonth() + 1)
  const [year,        setYear]        = useState(now.getFullYear())
  const [records,     setRecords]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [empLoading,  setEmpLoading]  = useState(true)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadFile,  setUploadFile]  = useState(null)
  const [uploading,   setUploading]   = useState(false)

  // Load employees once
  useEffect(() => {
    setEmpLoading(true)
    getEmployees({ status: 'active' })
      .then(r => {
        setEmployees(r.data)
        if (r.data.length > 0) setSelEmpId(r.data[0].id)
      })
      .catch(() => setError('Failed to load employees'))
      .finally(() => setEmpLoading(false))
  }, [])

  // Load attendance when employee/month/year changes
  const loadAttendance = useCallback(() => {
    if (!selEmpId) return
    setLoading(true)
    getAttendance({ employee_id: selEmpId, month, year })
      .then(r => setRecords(r.data))
      .catch(() => setError('Failed to load attendance'))
      .finally(() => setLoading(false))
  }, [selEmpId, month, year])

  useEffect(() => { loadAttendance() }, [loadAttendance])

  const selEmp = employees.find(e => e.id === parseInt(selEmpId))
  const numDays = daysInMonth(month, year)
  const stdHours = selEmp?.standard_hours || 8

  // Build map date→record
  const recMap = {}
  records.forEach(r => {
    const d = new Date(r.date)
    recMap[d.getUTCDate()] = r
  })

  // Summary stats
  const presentDays  = records.filter(r => r.is_present).length
  const absentDays   = numDays - presentDays
  const totalOT      = records.reduce((s, r) => s + (r.ot_hours || 0), 0)
  const totalLess    = records.reduce((s, r) => s + (r.less_hours || 0), 0)
  const perDay       = selEmp ? selEmp.monthly_salary / (selEmp.work_days_per_month || 30) : 0
  const perHr        = perDay / stdHours
  const estGross     = presentDays * perDay
  const estExtra     = totalOT * perHr
  const estLess      = totalLess * perHr
  const estNet       = estGross + estExtra - estLess

  const handleSaveRow = async ({ date, in_time, out_time, out_hours }) => {
    setError('')
    try {
      await upsertAttendance({ employee_id: parseInt(selEmpId), date, in_time, out_time, out_hours })
      loadAttendance()
      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAttendance(id)
      loadAttendance()
    } catch { setError('Delete failed') }
  }

  const handleBulkUpload = async () => {
    if (!uploadFile || !selEmpId) return
    setUploading(true)
    try {
      const { data } = await bulkUpload(selEmpId, uploadFile)
      setSuccess(`✅ Uploaded ${data.uploaded} records${data.errors?.length ? `. ${data.errors.length} errors skipped.` : ''}`)
      setUploadModal(false)
      setUploadFile(null)
      loadAttendance()
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarDays size={20} /> Attendance
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{MONTHS_FULL[month - 1]} {year}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
          <button onClick={loadAttendance} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={() => setUploadModal(true)} className="btn-secondary">
            <Upload size={14} /> Bulk Upload
          </button>
        </div>
      </div>

      <Alert type="error"   message={error}   onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Employee selector */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <User size={16} className="text-slate-500 flex-shrink-0" />
        <label className="label mb-0">Employee:</label>
        {empLoading ? (
          <Loader2 size={16} className="animate-spin text-blue-400" />
        ) : (
          <select
            value={selEmpId}
            onChange={e => setSelEmpId(e.target.value)}
            className="input max-w-xs text-sm"
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>
            ))}
          </select>
        )}
        {selEmp && (
          <div className="flex gap-4 text-xs text-slate-500 ml-2">
            <span>Salary: <span className="text-emerald-400 font-semibold">₹{selEmp.monthly_salary.toLocaleString('en-IN')}</span></span>
            <span>Std Hours: <span className="text-blue-400 font-semibold">{selEmp.standard_hours}h</span></span>
            <span>Per Day: <span className="text-yellow-400 font-semibold">₹{perDay.toFixed(2)}</span></span>
            <span>Per Hour: <span className="text-purple-400 font-semibold">₹{perHr.toFixed(2)}</span></span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {selEmp && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Present', value: presentDays, sub: `of ${numDays} days`, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/40' },
            { label: 'Absent',  value: absentDays,  sub: `days missed`,        color: 'text-red-400',     bg: 'bg-red-900/20 border-red-800/40' },
            { label: 'OT Hours',value: totalOT.toFixed(2)+'h', sub: `+₹${estExtra.toFixed(0)}`, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/40' },
            { label: 'Est. Net',value: '₹'+Math.round(estNet).toLocaleString('en-IN'), sub: 'before deductions', color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/40' },
          ].map(({ label, value, sub, color, bg }) => (
            <div key={label} className={`card p-4 border ${bg}`}>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              <div className="text-xs text-slate-600 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Attendance table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Daily Attendance — {selEmp?.name || 'Select employee'}
          </h3>
          <span className="text-xs text-slate-500">
            Click time fields to edit · Changes save instantly
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-blue-400" /></div>
        ) : !selEmpId ? (
          <div className="text-center py-16 text-slate-500 text-sm">Select an employee above</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/80">
                  {['Day','','Status','In Time','Out Time','Total Hrs','OT / Less','Out Hrs',''].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numDays }, (_, i) => i + 1).map(day => (
                  <DayRow
                    key={day}
                    day={day} month={month} year={year}
                    record={recMap[day]}
                    stdHours={stdHours}
                    onSave={handleSaveRow}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="bg-slate-800 border-t-2 border-slate-700">
                  <td colSpan={5} className="px-3 py-3 text-xs font-bold text-slate-300 uppercase tracking-wide">MONTHLY TOTALS</td>
                  <td className="px-3 py-3 text-xs font-mono font-bold text-slate-200 text-center">
                    {records.reduce((s, r) => s + (r.total_hours || 0), 0).toFixed(1)}h
                  </td>
                  <td className="px-3 py-3 text-xs font-mono font-bold text-center">
                    <span className="text-emerald-400">+{totalOT.toFixed(2)}h</span>
                    <span className="text-slate-600 mx-1">/</span>
                    <span className="text-red-400">-{totalLess.toFixed(2)}h</span>
                  </td>
                  <td colSpan={2} className="px-3 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Bulk upload modal */}
      {uploadModal && (
        <Modal title="Bulk Upload Attendance" onClose={() => { setUploadModal(false); setUploadFile(null) }}>
          <div className="space-y-5">
            <div className="bg-slate-800 rounded-xl p-4 text-sm text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300 mb-2">Excel file format required:</p>
              <p>Column A: <code className="text-blue-400">DATE</code> (e.g. 01-05-2026 or 2026-05-01)</p>
              <p>Column B: <code className="text-blue-400">IN TIME</code> (e.g. 11:00)</p>
              <p>Column C: <code className="text-blue-400">OUT TIME</code> (e.g. 19:00)</p>
              <p>Column D: <code className="text-blue-400">OUT HR</code> (optional, e.g. 0.5)</p>
            </div>
            <div>
              <label className="label">Select Employee</label>
              <select value={selEmpId} onChange={e => setSelEmpId(e.target.value)} className="input">
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Excel File (.xlsx)</label>
              <input type="file" accept=".xlsx,.xls"
                onChange={e => setUploadFile(e.target.files[0])}
                className="input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600/20 file:text-blue-400 file:text-xs file:cursor-pointer" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleBulkUpload} disabled={!uploadFile || uploading} className="btn-primary">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <button onClick={() => { setUploadModal(false); setUploadFile(null) }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
