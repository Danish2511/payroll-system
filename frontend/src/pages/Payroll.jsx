import { useState, useEffect, useCallback } from 'react'
import {
  getEmployees, getPayrolls, calculatePayroll,
  downloadMonthlyExcel, downloadPayslipPdf, triggerDownload
} from '../api'
import { Modal, PageLoader, Alert, EmptyState, MonthYearPicker, fmtCurrency, MONTHS_FULL } from '../components/UI'
import {
  DollarSign, FileSpreadsheet, FileText, Calculator,
  RefreshCw, CheckCircle, Clock, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'

const now = new Date()

// ── Payroll calculator modal ──────────────────────────────
function CalcModal({ employee, month, year, existing, onDone, onClose }) {
  const [advance,    setAdvance]    = useState(existing?.advance    || 0)
  const [deposit,    setDeposit]    = useState(existing?.deposit    || 0)
  const [incentives, setIncentives] = useState(existing?.incentives || 0)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const perDay = employee.monthly_salary / (employee.work_days_per_month || 30)
  const perHr  = perDay / (employee.standard_hours || 8)

  const handleCalc = async () => {
    setSaving(true); setError('')
    try {
      await calculatePayroll({
        employee_id: employee.id,
        month, year,
        advance:    parseFloat(advance)    || 0,
        deposit:    parseFloat(deposit)    || 0,
        incentives: parseFloat(incentives) || 0,
      })
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Calculation failed. Make sure attendance is entered first.')
    } finally { setSaving(false) }
  }

  return (
    <Modal title={`Calculate Payroll — ${employee.name}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Employee info */}
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Monthly Salary', fmtCurrency(employee.monthly_salary)],
            ['Per Day',        fmtCurrency(perDay)],
            ['Per Hour',       fmtCurrency(perHr)],
            ['Std Hours',      `${employee.standard_hours}h`],
            ['Work Days',      employee.work_days_per_month || 30],
            ['Department',     employee.department || '—'],
          ].map(([l, v]) => (
            <div key={l} className="bg-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-500 mb-0.5">{l}</div>
              <div className="text-sm font-semibold text-white">{v}</div>
            </div>
          ))}
        </div>

        {/* Deductions/additions */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Manual Entries</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Advance / Labour (₹)</label>
              <input type="number" min="0" step="100" className="input" value={advance}
                onChange={e => setAdvance(e.target.value)} placeholder="0" />
              <p className="text-xs text-slate-600 mt-1">ADV/LAB deduction</p>
            </div>
            <div>
              <label className="label">Deposit (₹)</label>
              <input type="number" min="0" step="100" className="input" value={deposit}
                onChange={e => setDeposit(e.target.value)} placeholder="0" />
              <p className="text-xs text-slate-600 mt-1">DEPOSITE column</p>
            </div>
            <div>
              <label className="label">Incentives (₹)</label>
              <input type="number" min="0" step="100" className="input" value={incentives}
                onChange={e => setIncentives(e.target.value)} placeholder="0" />
              <p className="text-xs text-slate-600 mt-1">Home visit / bonus</p>
            </div>
          </div>
        </div>

        {/* Formula preview */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-400 space-y-1">
          <div className="text-slate-300 font-semibold mb-2 text-sm not-italic">Calculation Formula</div>
          <div>Gross = Present Days × Per Day</div>
          <div>Extra Pay = OT Hours × Per Hour</div>
          <div>Less Deduction = (Less Hours + Out Hours) × Per Hour</div>
          {employee.pf_applicable && (
            <div>PF = {employee.monthly_salary.toLocaleString()} × {employee.pf_percent}% = ₹{(employee.monthly_salary * employee.pf_percent / 100).toFixed(2)}</div>
          )}
          <div className="border-t border-slate-700 mt-2 pt-2 text-emerald-400 font-bold">
            Net Pay = Gross + Extra − Less − Advance − Deposit − PF + Incentives
          </div>
        </div>

        {error && <Alert type="error" message={error} />}

        <div className="flex gap-3">
          <button onClick={handleCalc} disabled={saving} className="btn-primary flex-1 justify-center py-3">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
            {saving ? 'Calculating…' : 'Calculate & Save Payroll'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Payroll row ───────────────────────────────────────────
function PayrollRow({ emp, payroll, month, year, onCalc, onDownloadPdf }) {
  const [expanded, setExpanded] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      const { data } = await downloadPayslipPdf(emp.id, month, year)
      triggerDownload(data, `Payslip_${emp.name}_${MONTHS_FULL[month-1]}_${year}.pdf`)
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not generate PDF. Calculate payroll first.')
    } finally { setPdfLoading(false) }
  }

  const hasPayroll = !!payroll

  return (
    <>
      <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/40">
        <td className="td">
          <div className="font-medium text-white">{emp.name}</div>
          <div className="text-xs text-slate-500">{emp.designation} · {emp.department}</div>
        </td>
        <td className="td text-slate-400 text-sm">{fmtCurrency(emp.monthly_salary)}</td>
        <td className="td">
          {hasPayroll ? (
            <div className="flex gap-1.5">
              <span className="badge-green">{payroll.present_days}P</span>
              <span className="badge-red">{payroll.absent_days}A</span>
            </div>
          ) : <span className="text-slate-600 text-xs">No attendance</span>}
        </td>
        <td className="td text-yellow-400 text-sm font-mono">
          {hasPayroll ? `${payroll.total_ot_hours.toFixed(2)}h` : '—'}
        </td>
        <td className="td text-red-400 text-sm font-mono">
          {hasPayroll ? `${payroll.total_less_hours.toFixed(2)}h` : '—'}
        </td>
        <td className="td text-slate-300 text-sm font-mono">
          {hasPayroll ? fmtCurrency(payroll.gross_salary) : '—'}
        </td>
        <td className="td">
          <span className={`text-base font-bold font-mono ${hasPayroll ? 'text-emerald-400' : 'text-slate-600'}`}>
            {hasPayroll ? fmtCurrency(payroll.net_pay) : '—'}
          </span>
        </td>
        <td className="td">
          {hasPayroll
            ? <span className="badge-green"><CheckCircle size={10} /> Done</span>
            : <span className="badge-yellow"><Clock size={10} /> Pending</span>
          }
        </td>
        <td className="td">
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={onCalc} className="btn-secondary py-1 px-2 text-xs">
              <Calculator size={11} /> {hasPayroll ? 'Recalc' : 'Calculate'}
            </button>
            {hasPayroll && (
              <>
                <button onClick={handlePdf} disabled={pdfLoading}
                  className="btn-secondary py-1 px-2 text-xs text-red-400 border-red-800">
                  {pdfLoading ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />} PDF
                </button>
                <button onClick={() => setExpanded(!expanded)}
                  className="btn-secondary py-1 px-2 text-xs">
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {/* Expanded breakdown */}
      {expanded && hasPayroll && (
        <tr className="bg-slate-800/20">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Gross Salary',      value: fmtCurrency(payroll.gross_salary),    color: 'text-white' },
                { label: 'Extra Pay (OT)',     value: fmtCurrency(payroll.extra_pay),       color: 'text-emerald-400' },
                { label: 'Less Deduction',     value: fmtCurrency(payroll.less_deduction),  color: 'text-red-400' },
                { label: 'Advance / Labour',   value: fmtCurrency(payroll.advance),         color: 'text-red-400' },
                { label: 'Deposit',            value: fmtCurrency(payroll.deposit),         color: 'text-red-400' },
                { label: 'PF Deduction',       value: fmtCurrency(payroll.pf_deduction),    color: 'text-red-400' },
                { label: 'Incentives',         value: fmtCurrency(payroll.incentives),      color: 'text-emerald-400' },
                { label: 'Net Pay',            value: fmtCurrency(payroll.net_pay),         color: 'text-emerald-400 text-base font-bold' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 rounded-lg p-3">
                  <div className="text-slate-500 mb-0.5">{label}</div>
                  <div className={`font-semibold font-mono ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────
export default function Payroll() {
  const [employees,  setEmployees]  = useState([])
  const [payrolls,   setPayrolls]   = useState([])
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year,       setYear]       = useState(now.getFullYear())
  const [loading,    setLoading]    = useState(true)
  const [calcModal,  setCalcModal]  = useState(null)   // employee object
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [xlsLoading, setXlsLoading] = useState(false)
  const [bulkCalcing,setBulkCalcing]= useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getEmployees({ status: 'active' }),
      getPayrolls({ month, year }),
    ])
      .then(([eRes, pRes]) => {
        setEmployees(eRes.data)
        setPayrolls(pRes.data)
      })
      .catch(() => setError('Failed to load payroll data'))
      .finally(() => setLoading(false))
  }, [month, year])

  useEffect(() => { load() }, [load])

  const payrollMap = {}
  payrolls.forEach(p => { payrollMap[p.employee_id] = p })

  const totalNet       = payrolls.reduce((s, p) => s + p.net_pay, 0)
  const processed      = payrolls.length
  const totalOT        = payrolls.reduce((s, p) => s + p.total_ot_hours, 0)
  const totalPresent   = payrolls.reduce((s, p) => s + p.present_days, 0)

  const handleCalcDone = () => {
    setCalcModal(null)
    setSuccess('Payroll calculated successfully!')
    setTimeout(() => setSuccess(''), 3000)
    load()
  }

  const handleBulkCalc = async () => {
    if (!confirm(`Calculate payroll for ALL ${employees.length} employees for ${MONTHS_FULL[month-1]} ${year}? This will use existing attendance data.`)) return
    setBulkCalcing(true)
    let done = 0, failed = 0
    for (const emp of employees) {
      try {
        await calculatePayroll({ employee_id: emp.id, month, year, advance: 0, deposit: 0, incentives: 0 })
        done++
      } catch { failed++ }
    }
    setBulkCalcing(false)
    setSuccess(`Bulk calculation done: ${done} processed, ${failed} failed.`)
    load()
  }

  const handleDownloadExcel = async () => {
    setXlsLoading(true)
    try {
      const { data } = await downloadMonthlyExcel(month, year)
      triggerDownload(data, `Payroll_${MONTHS_FULL[month-1]}_${year}.xlsx`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Excel download failed. Calculate payroll first.')
    } finally { setXlsLoading(false) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign size={20} /> Payroll
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{MONTHS_FULL[month-1]} {year}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={handleBulkCalc} disabled={bulkCalcing || employees.length === 0} className="btn-secondary">
            {bulkCalcing ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
            {bulkCalcing ? 'Calculating…' : 'Bulk Calculate All'}
          </button>
          <button onClick={handleDownloadExcel} disabled={xlsLoading || payrolls.length === 0} className="btn-success">
            {xlsLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            {xlsLoading ? 'Generating…' : 'Download Excel'}
          </button>
        </div>
      </div>

      <Alert type="error"   message={error}   onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Net Payroll',    value: fmtCurrency(totalNet),       color: 'text-emerald-400', bg: 'border-emerald-800/40' },
          { label: 'Payrolls Processed',   value: `${processed} / ${employees.length}`, color: 'text-blue-400', bg: 'border-blue-800/40' },
          { label: 'Total Present Days',   value: totalPresent,                color: 'text-yellow-400', bg: 'border-yellow-800/40' },
          { label: 'Total OT Hours',       value: `${totalOT.toFixed(1)}h`,    color: 'text-purple-400', bg: 'border-purple-800/40' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card p-4 border ${bg}`}>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Workflow note */}
      <div className="bg-blue-900/10 border border-blue-800/40 rounded-xl px-4 py-3 text-xs text-blue-400 flex gap-3 items-start">
        <span className="text-lg">💡</span>
        <span>
          <strong>Workflow:</strong> First enter attendance for each employee in the Attendance page.
          Then come here and click <strong>Calculate</strong> (or Bulk Calculate All) to compute payroll from that attendance data.
          Then download Excel or individual PDF payslips.
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Employee Payroll — {MONTHS_FULL[month-1]} {year}</h3>
          <span className="text-xs text-slate-600">Click ▼ to expand breakdown</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-blue-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Employee','Basic Salary','Attendance','OT Hours','Less Hours','Gross','Net Pay','Status','Actions'].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0
                  ? <EmptyState message="No active employees. Add employees first." />
                  : employees.map(emp => (
                    <PayrollRow
                      key={emp.id}
                      emp={emp}
                      payroll={payrollMap[emp.id]}
                      month={month}
                      year={year}
                      onCalc={() => setCalcModal(emp)}
                      onDownloadPdf={() => {}}
                    />
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Calculation modal */}
      {calcModal && (
        <CalcModal
          employee={calcModal}
          month={month}
          year={year}
          existing={payrollMap[calcModal.id]}
          onDone={handleCalcDone}
          onClose={() => setCalcModal(null)}
        />
      )}
    </div>
  )
}
