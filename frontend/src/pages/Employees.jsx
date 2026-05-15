import { useState, useEffect, useCallback } from 'react'
import {
  getEmployees, getNextEmpCode, getEmployeeStats,
  createEmployee, updateEmployee, deleteEmployee
} from '../api'
import { Modal, Alert, EmptyState, fmtCurrency } from '../components/UI'
import {
  Plus, Search, Pencil, Trash2, Users, Loader2, RefreshCw,
  BadgeCheck, UserX, Building2, Copy, Eye, EyeOff, X
} from 'lucide-react'
import { useForm } from 'react-hook-form'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const DESIG = [
  'RMO', 'AC', 'REC', 'Nurse', 'Pharmacist',
  'Lab Tech', 'Admin', 'Receptionist', 'Support', 'Staff', 'Other',
]
const DEPTS = [
  'Medical', 'Nursing', 'Reception', 'Admin',
  'Operations', 'Laboratory', 'Pharmacy', 'Support',
]

// ─────────────────────────────────────────────────────────────
// Stat Card (mini)
// ─────────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <div className="text-lg font-bold text-white leading-none">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Employee Form  (Create & Edit)
// ─────────────────────────────────────────────────────────────
function EmployeeForm({ defaultValues = {}, isEdit = false, autoCode = '', onSubmit, saving, onClose }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      standard_hours:      8,
      work_days_per_month: 30,
      status:              'active',
      pf_applicable:       false,
      pf_percent:          0,
      ...defaultValues,
      // On create, pre-fill the auto-generated code
      employee_code: isEdit ? defaultValues.employee_code : autoCode,
    },
  })

  const [showBank,    setShowBank]    = useState(false)
  const [codeCopied,  setCodeCopied]  = useState(false)
  const pfApplicable = watch('pf_applicable')
  const empCode      = watch('employee_code')
  const salary       = watch('monthly_salary') || 0
  const stdHours     = watch('standard_hours')  || 8
  const workDays     = watch('work_days_per_month') || 30
  const perDay       = salary > 0 ? (salary / workDays).toFixed(2) : '—'
  const perHr        = salary > 0 ? (salary / workDays / stdHours).toFixed(2) : '—'

  const copyCode = () => {
    navigator.clipboard.writeText(empCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1500)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── Section 1: Identity ─────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <BadgeCheck size={13} /> Basic Information
        </h3>
        <div className="grid grid-cols-2 gap-3">

          {/* Auto-generated Employee Code */}
          <div>
            <label className="label">
              Employee Code
              {!isEdit && (
                <span className="ml-2 text-blue-400 font-normal normal-case tracking-normal">
                  ✦ Auto-generated
                </span>
              )}
            </label>
            <div className="relative">
              <input
                className={`input pr-20 font-mono ${!isEdit ? 'bg-slate-700/50 text-blue-300 cursor-default' : ''}`}
                readOnly={!isEdit}
                {...register('employee_code', { required: 'Required' })}
              />
              {/* Copy button */}
              <button
                type="button"
                onClick={copyCode}
                title="Copy code"
                className="absolute right-2 top-1.5 px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white text-xs transition-colors"
              >
                {codeCopied ? '✓ Copied' : <Copy size={11} />}
              </button>
            </div>
            {!isEdit && (
              <p className="text-slate-600 text-xs mt-1">
                Unique code assigned automatically — cannot be changed
              </p>
            )}
            {errors.employee_code && (
              <p className="text-red-400 text-xs mt-1">{errors.employee_code.message}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              placeholder="Dr. Jane Doe"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Designation */}
          <div>
            <label className="label">Designation</label>
            <select className="input" {...register('designation')}>
              <option value="">Select…</option>
              {DESIG.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="label">Department</label>
            <select className="input" {...register('department')}>
              <option value="">Select…</option>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Joining Date */}
          <div>
            <label className="label">Joining Date</label>
            <input type="date" className="input" {...register('joining_date')} />
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="doctor@clinic.com"
              {...register('email')}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              placeholder="9876543210"
              maxLength={10}
              {...register('phone')}
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Section 2: Salary ───────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <BadgeCheck size={13} /> Salary Configuration
        </h3>
        <div className="grid grid-cols-2 gap-3">

          {/* Monthly Salary */}
          <div>
            <label className="label">Monthly Salary (₹) *</label>
            <input
              type="number"
              className="input"
              placeholder="31200"
              {...register('monthly_salary', {
                required:      'Salary is required',
                valueAsNumber: true,
                min:           { value: 1, message: 'Must be greater than 0' },
              })}
            />
            {errors.monthly_salary && (
              <p className="text-red-400 text-xs mt-1">{errors.monthly_salary.message}</p>
            )}
          </div>

          {/* Standard Hours */}
          <div>
            <label className="label">Standard Hours / Day</label>
            <select className="input" {...register('standard_hours', { valueAsNumber: true })}>
              <option value={6}>6 hours</option>
              <option value={8}>8 hours (standard)</option>
              <option value={12}>12 hours (RMO / 24hr duty)</option>
            </select>
          </div>

          {/* Work Days */}
          <div>
            <label className="label">Working Days / Month</label>
            <select className="input" {...register('work_days_per_month', { valueAsNumber: true })}>
              <option value={26}>26 days</option>
              <option value={30}>30 days (default)</option>
              <option value={31}>31 days</option>
            </select>
            <p className="text-slate-600 text-xs mt-1">Divisor for per-day calculation</p>
          </div>

          {/* Live preview */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex flex-col justify-center">
            <p className="text-xs text-slate-500 mb-1">Live Preview</p>
            <div className="flex gap-4 text-sm font-mono">
              <span>
                <span className="text-slate-500">Per Day </span>
                <span className="text-emerald-400 font-semibold">₹{perDay}</span>
              </span>
              <span>
                <span className="text-slate-500">Per Hr </span>
                <span className="text-yellow-400 font-semibold">₹{perHr}</span>
              </span>
            </div>
          </div>
        </div>

        {/* PF */}
        <div className="mt-3 bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-blue-500"
              {...register('pf_applicable')}
            />
            <span className="text-sm text-slate-300 font-medium">PF (Provident Fund) Applicable</span>
          </label>
          {pfApplicable && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">PF %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="input w-24"
                placeholder="12"
                {...register('pf_percent', { valueAsNumber: true })}
              />
              <span className="text-xs text-slate-500">
                = ₹{salary > 0 ? ((salary * (watch('pf_percent') || 0)) / 100).toFixed(2) : '0.00'}/month
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Bank (collapsible) ───────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowBank(!showBank)}
          className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:text-slate-200 transition-colors"
        >
          <BadgeCheck size={13} />
          Bank Details (optional)
          <span className="text-blue-400 text-xs font-normal normal-case ml-1">
            {showBank ? '▲ hide' : '▼ show'}
          </span>
        </button>

        {showBank && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className="label">Bank Name</label>
              <input className="input" placeholder="SBI" {...register('bank_name')} />
            </div>
            <div>
              <label className="label">Account Number</label>
              <input className="input" placeholder="1234567890" {...register('bank_account')} />
            </div>
            <div>
              <label className="label">IFSC Code</label>
              <input
                className="input font-mono uppercase"
                placeholder="SBIN0001234"
                {...register('bank_ifsc')}
              />
              {errors.bank_ifsc && (
                <p className="text-red-400 text-xs mt-1">{errors.bank_ifsc.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────── */}
      <div className="flex gap-3 pt-3 border-t border-slate-800">
        <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-2.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Create Employee'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────
// View Employee Modal (read-only details)
// ─────────────────────────────────────────────────────────────
function ViewModal({ emp, onClose, onEdit }) {
  const perDay = (emp.monthly_salary / (emp.work_days_per_month || 30)).toFixed(2)
  const perHr  = (emp.monthly_salary / (emp.work_days_per_month || 30) / (emp.standard_hours || 8)).toFixed(2)

  const Row = ({ label, value, mono = false }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm text-slate-200 ${mono ? 'font-mono' : 'font-medium'}`}>{value || '—'}</span>
    </div>
  )

  return (
    <Modal title={emp.name} onClose={onClose}>
      <div className="space-y-4">
        {/* Header badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-lg font-bold text-blue-400">
            {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white">{emp.name}</div>
            <div className="text-xs text-slate-400">{emp.designation} · {emp.department}</div>
            <span className={`mt-1 ${emp.status === 'active' ? 'badge-green' : 'badge-red'}`}>
              {emp.status}
            </span>
          </div>
          <div className="ml-auto font-mono text-blue-400 text-sm bg-blue-900/20 border border-blue-800 px-3 py-1 rounded-lg">
            {emp.employee_code}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Identity</p>
            <Row label="Email"        value={emp.email} />
            <Row label="Phone"        value={emp.phone} />
            <Row label="Joining Date" value={emp.joining_date} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Salary</p>
            <Row label="Monthly"   value={fmtCurrency(emp.monthly_salary)} mono />
            <Row label="Per Day"   value={`₹${perDay}`} mono />
            <Row label="Per Hour"  value={`₹${perHr}`}  mono />
            <Row label="Std Hours" value={`${emp.standard_hours}h / day`} />
            <Row label="Work Days" value={`${emp.work_days_per_month} days`} />
            {emp.pf_applicable && (
              <Row label="PF" value={`${emp.pf_percent}% = ${fmtCurrency(emp.monthly_salary * emp.pf_percent / 100)}`} mono />
            )}
          </div>
        </div>

        {(emp.bank_name || emp.bank_account) && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Bank</p>
            <Row label="Bank"    value={emp.bank_name} />
            <Row label="Account" value={emp.bank_account} mono />
            <Row label="IFSC"    value={emp.bank_ifsc}    mono />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onEdit} className="btn-primary flex-1 justify-center">
            <Pencil size={14} /> Edit Employee
          </button>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function Employees() {
  const [employees,  setEmployees]  = useState([])
  const [stats,      setStats]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter,setStatusFilter] = useState('')
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)  // null | 'create' | {emp} | {emp, view:true}
  const [nextCode,   setNextCode]   = useState('…')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  // Fetch employees
  const load = useCallback(() => {
    setLoading(true)
    getEmployees({
      search:     search     || undefined,
      department: deptFilter || undefined,
      status:     statusFilter || undefined,
    })
      .then(r => setEmployees(r.data))
      .catch(() => setError('Failed to load employees'))
      .finally(() => setLoading(false))
  }, [search, deptFilter, statusFilter])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  // Fetch stats once on mount
  useEffect(() => {
    getEmployeeStats()
      .then(r => setStats(r.data))
      .catch(() => {})
  }, [employees.length])  // refresh when count changes

  // Fetch next auto-code when create modal opens
  const openCreate = async () => {
    try {
      const { data } = await getNextEmpCode()
      setNextCode(data.code)
    } catch {
      setNextCode('EMP001')
    }
    setModal('create')
  }

  const handleSave = async (data) => {
    setSaving(true); setError('')
    try {
      if (modal !== 'create' && !modal?.view) {
        await updateEmployee(modal.id, data)
        setSuccess(`✅ ${data.name} updated successfully!`)
      } else {
        await createEmployee(data)
        setSuccess(`✅ ${data.name} (${data.employee_code}) created!`)
      }
      setModal(null)
      load()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error saving employee')
    } finally { setSaving(false) }
  }

  const handleDelete = async (emp) => {
    if (!confirm(
      `Delete "${emp.name}" (${emp.employee_code})?\n\n` +
      `⚠️  This will permanently delete all their attendance and payroll records.\n` +
      `Consider marking as Inactive instead.`
    )) return
    try {
      await deleteEmployee(emp.id)
      setSuccess(`🗑️ ${emp.name} deleted`)
      load()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error deleting employee')
    }
  }

  // Unique departments from loaded employees
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))]

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={20} /> Employees
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {employees.length} shown · {stats?.active ?? '…'} active · {stats?.inactive ?? '…'} inactive
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={14} /> Add Employee
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat icon={Users}    label="Total Employees" value={stats.total}       color="bg-blue-600" />
          <MiniStat icon={BadgeCheck} label="Active"        value={stats.active}      color="bg-emerald-600" />
          <MiniStat icon={UserX}    label="Inactive"        value={stats.inactive}    color="bg-red-600" />
          <MiniStat icon={Building2} label="Departments"    value={stats.departments} color="bg-purple-600" />
        </div>
      )}

      <Alert type="error"   message={error}   onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            className="input pl-8 text-sm"
            placeholder="Search name, code, dept…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Department filter */}
        <select
          className="input w-44 text-sm"
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>

        {/* Status filter */}
        <select
          className="input w-36 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Clear filters */}
        {(search || deptFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter('') }}
            className="btn-secondary text-xs px-3"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Code', 'Name', 'Designation', 'Department', 'Monthly Salary', 'Per Day', 'Std Hrs', 'Status', 'Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Loader2 className="animate-spin inline text-blue-400" size={24} />
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <EmptyState message={
                  search || deptFilter || statusFilter
                    ? 'No employees match your filters.'
                    : 'No employees yet. Click "Add Employee" to get started.'
                } />
              ) : (
                employees.map(emp => {
                  const perDay = (emp.monthly_salary / (emp.work_days_per_month || 30)).toFixed(0)
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-800/30 transition-colors ${emp.status === 'inactive' ? 'opacity-60' : ''}`}
                    >
                      {/* Code — clickable chip */}
                      <td className="td">
                        <span className="font-mono text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg text-blue-400">
                          {emp.employee_code}
                        </span>
                      </td>

                      {/* Name + initials avatar */}
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0">
                            {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{emp.name}</span>
                        </div>
                      </td>

                      <td className="td text-slate-400 text-xs">{emp.designation || '—'}</td>
                      <td className="td text-slate-400 text-xs">{emp.department  || '—'}</td>

                      {/* Salary */}
                      <td className="td font-mono text-emerald-400 text-sm">
                        {fmtCurrency(emp.monthly_salary)}
                      </td>
                      <td className="td font-mono text-slate-400 text-xs">
                        ₹{Number(perDay).toLocaleString('en-IN')}
                      </td>
                      <td className="td text-slate-400 text-xs">{emp.standard_hours}h</td>

                      {/* Status badge */}
                      <td className="td">
                        <span className={emp.status === 'active' ? 'badge-green' : 'badge-red'}>
                          {emp.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="td">
                        <div className="flex gap-1">
                          {/* View */}
                          <button
                            onClick={() => setModal({ ...emp, view: true })}
                            title="View details"
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-blue-400 transition-colors"
                          >
                            <Eye size={13} />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => setModal(emp)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(emp)}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {employees.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
              {(search || deptFilter || statusFilter) && ' (filtered)'}
            </span>
            <span className="font-mono">
              Total payroll: <span className="text-emerald-400 font-semibold">
                {fmtCurrency(employees.filter(e => e.status === 'active').reduce((s, e) => s + e.monthly_salary, 0))}
              </span> / month
            </span>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────── */}

      {/* View modal */}
      {modal?.view && (
        <ViewModal
          emp={modal}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ ...modal, view: false })}
        />
      )}

      {/* Create modal */}
      {modal === 'create' && (
        <Modal title="Add New Employee" onClose={() => setModal(null)} wide>
          <EmployeeForm
            isEdit={false}
            autoCode={nextCode}
            onSubmit={handleSave}
            saving={saving}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {modal && modal !== 'create' && !modal.view && (
        <Modal title={`Edit — ${modal.name}`} onClose={() => setModal(null)} wide>
          <EmployeeForm
            isEdit={true}
            defaultValues={modal}
            onSubmit={handleSave}
            saving={saving}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  )
}
