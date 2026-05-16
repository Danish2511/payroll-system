import { useState, useEffect, useCallback } from "react";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../api";
import {
  Modal,
  PageLoader,
  Alert,
  EmptyState,
  fmtCurrency,
} from "../components/UI";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";

const DESIG = [
  "RMO",
  "AC",
  "REC",
  "Nurse",
  "Pharmacist",
  "Lab Tech",
  "Admin",
  "Receptionist",
  "Support",
  "Staff",
  "Other",
];
const DEPTS = [
  "Medical",
  "Nursing",
  "Reception",
  "Admin",
  "Operations",
  "Laboratory",
  "Pharmacy",
  "Support",
];

function EmployeeForm({ defaultValues = {}, onSubmit, saving }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Employee Code *</label>
          <input
            className="input"
            placeholder="E001"
            {...register("employee_code", { required: "Required" })}
          />
          {errors.employee_code && (
            <p className="text-red-400 text-xs mt-1">
              {errors.employee_code.message}
            </p>
          )}
        </div>
        <div>
          <label className="label">Full Name *</label>
          <input
            className="input"
            placeholder="Dr. John Doe"
            {...register("name", { required: "Required" })}
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="label">Designation</label>
          <select className="input" {...register("designation")}>
            <option value="">Select…</option>
            {DESIG.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Department</label>
          <select className="input" {...register("department")}>
            <option value="">Select…</option>
            {DEPTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Monthly Salary (₹) *</label>
          <input
            type="number"
            className="input"
            placeholder="31200"
            {...register("monthly_salary", {
              required: "Required",
              valueAsNumber: true,
              min: 0,
            })}
          />
          {errors.monthly_salary && (
            <p className="text-red-400 text-xs mt-1">
              {errors.monthly_salary.message}
            </p>
          )}
        </div>
        <div>
          <label className="label">Standard Hours / Day</label>
          <input
            type="number"
            step="0.5"
            className="input"
            defaultValue={8}
            {...register("standard_hours", { valueAsNumber: true })}
          />
          <p className="text-slate-600 text-xs mt-1">
            8h normal staff, 12h for RMO/24hr duty
          </p>
        </div>
        <div>
          <label className="label">Work Days / Month (divisor)</label>
          <input
            type="number"
            className="input"
            defaultValue={30}
            {...register("work_days_per_month", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className="label">Joining Date</label>
          <input type="date" className="input" {...register("joining_date")} />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="doctor@clinic.com"
            {...register("email")}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            placeholder="9876543210"
            {...register("phone")}
          />
        </div>
        <div>
          <label className="label">Bank Name</label>
          <input className="input" {...register("bank_name")} />
        </div>
        <div>
          <label className="label">Bank Account No</label>
          <input className="input" {...register("bank_account")} />
        </div>
        <div>
          <label className="label">IFSC Code</label>
          <input className="input" {...register("bank_ifsc")} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="col-span-2">
          <div className="flex items-center gap-4 bg-slate-800 rounded-xl p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                {...register("pf_applicable")}
              />
              <span className="text-sm text-slate-300">PF Applicable</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">PF %:</label>
              <input
                type="number"
                step="0.01"
                className="input w-24"
                defaultValue={0}
                {...register("pf_percent", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-2 border-t border-slate-800">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : "Save Employee"}
        </button>
      </div>
    </form>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | emp object
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { user } = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    getEmployees({ search: search || undefined })
      .then((r) => setEmployees(r.data))
      .catch(() => setError("Failed to load employees"))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleSave = async (data) => {
    setSaving(true);
    setError("");
    try {
      if (modal !== "create") await updateEmployee(modal.id, data);
      else await createEmployee(data);
      setSuccess(
        modal !== "create" ? "Employee updated!" : "Employee created!",
      );
      setModal(null);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || "Error saving employee");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp) => {
    if (
      !confirm(
        `Delete ${emp.name}? This will remove all their attendance and payroll data.`,
      )
    )
      return;
    try {
      await deleteEmployee(emp.id);
      setSuccess("Employee deleted");
      load();
    } catch (e) {
      setError(e.response?.data?.detail || "Error deleting");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={20} /> Employees
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {employees.length} registered
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setModal("create")} className="btn-primary">
            <Plus size={14} /> Add Employee
          </button>
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
        <input
          className="input pl-8 text-sm"
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Code",
                  "Name",
                  "Designation",
                  "Department",
                  "Salary",
                  "Std Hrs",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2
                      className="animate-spin inline text-blue-400"
                      size={24}
                    />
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <EmptyState message="No employees found. Add your first employee →" />
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="td font-mono text-xs text-slate-400">
                      {emp.employee_code}
                    </td>
                    <td className="td font-semibold">{emp.name}</td>
                    <td className="td text-slate-400 text-xs">
                      {emp.designation || "—"}
                    </td>
                    <td className="td text-slate-400 text-xs">
                      {emp.department || "—"}
                    </td>
                    {/* <td className="td font-mono text-emerald-400">{fmtCurrency(emp.monthly_salary)}</td> */}
                    {/* <td className="td font-mono text-emerald-400">
                      {user?.role === "admin"
                        ? fmtCurrency(emp.monthly_salary)
                        : "₹ ******"}
                    </td> */}
                    <td className="td font-mono text-emerald-400">
                      {user?.role === "admin"
                        ? "₹*****"
                        : "₹*****"}
                    </td>
                    <td className="td text-slate-400 text-xs">
                      {emp.standard_hours}h
                    </td>
                    <td className="td">
                      <span
                        className={
                          emp.status === "active" ? "badge-green" : "badge-red"
                        }
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setModal(emp)}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={
            modal === "create" ? "Add New Employee" : `Edit — ${modal.name}`
          }
          onClose={() => setModal(null)}
          wide
        >
          <EmployeeForm
            defaultValues={modal !== "create" ? modal : {}}
            onSubmit={handleSave}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  );
}
