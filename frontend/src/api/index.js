import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────
export const authLogin    = (d) => api.post('/api/auth/login', d)
export const authRegister = (d) => api.post('/api/auth/register', d)
export const authSeedDemo = ()  => api.post('/api/auth/seed-demo')
export const authMe       = ()  => api.get('/api/auth/me')

// ── Employees ─────────────────────────────────────────────
export const getEmployees     = (p)      => api.get('/api/employees/', { params: p })
export const getEmployee      = (id)     => api.get(`/api/employees/${id}`)
export const createEmployee   = (d)      => api.post('/api/employees/', d)
export const updateEmployee   = (id, d)  => api.put(`/api/employees/${id}`, d)
export const deleteEmployee   = (id)     => api.delete(`/api/employees/${id}`)
export const getDepartments   = ()       => api.get('/api/employees/meta/departments')

// ── Attendance ────────────────────────────────────────────
export const getAttendance    = (p)      => api.get('/api/attendance/', { params: p })
export const upsertAttendance = (d)      => api.post('/api/attendance/', d)
export const updateAttendance = (id, d)  => api.put(`/api/attendance/${id}`, d)
export const deleteAttendance = (id)     => api.delete(`/api/attendance/${id}`)
export const bulkUpload       = (empId, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/api/attendance/bulk-upload?employee_id=${empId}`, fd)
}

// ── Payroll ───────────────────────────────────────────────
export const calculatePayroll = (d)              => api.post('/api/payroll/calculate', d)
export const getPayrolls      = (p)              => api.get('/api/payroll/', { params: p })
export const downloadMonthlyExcel = (month, year) =>
  api.get('/api/payroll/export/monthly-excel', { params: { month, year }, responseType: 'blob' })
export const downloadPayslipPdf = (empId, month, year) =>
  api.get(`/api/payroll/export/payslip-pdf/${empId}`, { params: { month, year }, responseType: 'blob' })

// ── Reports ───────────────────────────────────────────────
export const downloadAttendanceExcel = (month, year) =>
  api.get('/api/reports/attendance-excel', { params: { month, year }, responseType: 'blob' })
export const getReportSummary = (month, year) =>
  api.get('/api/reports/summary', { params: { month, year } })

// ── Dashboard ─────────────────────────────────────────────
export const getDashboardStats = (month, year) =>
  api.get('/api/dashboard/stats', { params: { month, year } })

// ── Utility ───────────────────────────────────────────────
export const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default api
