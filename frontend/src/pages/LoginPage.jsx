import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authSeedDemo } from "../api";
import {
  Eye,
  EyeOff,
  Loader2,
  Building2,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Users,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";

// ── Right panel info ──────────────────────────────────────────────
const SUPPORT_POINTS = [
  "Drop a message on WhatsApp before calling — most issues resolve over chat.",
  "We are always busy helping customers. Please cooperate if we cannot pick up immediately.",
  "The more details you share, the faster we resolve your issue.",
];

const FEATURES = [
  {
    icon: Users,
    label: "Employee Management",
    desc: "Add, edit, track all employees",
  },
  {
    icon: FileSpreadsheet,
    label: "Automated Payroll",
    desc: "Excel-accurate salary calculations",
  },
  {
    icon: Clock,
    label: "Attendance Tracking",
    desc: "Daily entry with OT & night shifts",
  },
  {
    icon: ShieldCheck,
    label: "Secure & Role-based",
    desc: "Admin · HR · Employee access",
  },
];

// ── Main component ────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@clinic.com");
  const [password, setPassword] = useState("admin123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [seedMsg, setSeedMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password. Try seeding the demo first.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg("");
    try {
      const { data } = await authSeedDemo();
      setSeedMsg(`✅ ${data.message} — use admin@clinic.com / admin123`);
    } catch (e) {
      setSeedMsg(e.response?.data?.detail || "Already seeded or error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL — Login form ─────────────────────────── */}
      <div
        className="w-full lg:w-[42%] flex flex-col justify-center items-center
                      bg-white px-8 py-12 min-h-screen"
      >
        {/* Logo */}
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-10">
            <div
              className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center
                            shadow-xl shadow-blue-200 mb-4"
            >
              <Building2 size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Supe Hospital
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Heart And Diabetes Hospital And Research Centre
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-7">
            <h2 className="text-lg font-semibold text-slate-700 mb-1">
              Welcome back
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Sign in to your account to continue
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm
                             text-slate-800 placeholder-slate-300 bg-slate-50
                             focus:outline-none focus:ring-2 focus:ring-blue-500/30
                             focus:border-blue-400 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm
                               text-slate-800 placeholder-slate-300 bg-slate-50
                               focus:outline-none focus:ring-2 focus:ring-blue-500/30
                               focus:border-blue-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-xs">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300
                           text-white font-semibold rounded-xl py-2.5 text-sm
                           flex items-center justify-center gap-2
                           transition-all shadow-lg shadow-blue-100"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Signing in…" : "Log In"}
              </button>
            </form>

            {/* Seed section */}
            {/* <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-slate-400 text-xs text-center mb-3">
                First time setup? Create the demo account:
              </p>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="w-full border border-slate-200 rounded-xl py-2 text-xs font-medium
                           text-slate-500 hover:bg-slate-50 hover:text-slate-700
                           flex items-center justify-center gap-2 transition-all"
              >
                {seeding ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "🌱"
                )}
                {seeding ? "Setting up…" : "Seed Demo Data"}
              </button>
              {seedMsg && (
                <p className="text-emerald-600 text-xs mt-2 text-center leading-relaxed">
                  {seedMsg}
                </p>
              )}
            </div> */}
          </div>

          {/* Support footer */}
          {/* <div className="mt-6 text-center space-y-1">
            <p className="text-slate-400 text-xs">
              Support: Mon–Fri 03:00 PM to 05:30 PM
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="tel:+918856823979"
                className="flex items-center gap-1 text-slate-400 hover:text-blue-500 text-xs transition-colors"
              >
                <Phone size={11} /> +91 88568 23979
              </a>
              <a
                href="mailto:danish.shaikh3628@gmail.com"
                className="flex items-center gap-1 text-slate-400 hover:text-blue-500 text-xs transition-colors"
              >
                <Mail size={11} /> danish.shaikh3628@gmail.com
              </a>
            </div>
          </div> */}
        </div>
      </div>

      {/* ── RIGHT PANEL — Info panel ────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[58%] flex-col
                      bg-gradient-to-br from-[#3b3fce] via-[#4f46e5] to-[#6d28d9]
                      text-white overflow-y-auto"
      >
        {/* Top strip */}
        <div className="px-12 pt-12 pb-8">
          {/* <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">
                PayrollPro
              </div>
              <div className="text-indigo-300 text-xs">
                Payroll Management System
              </div>
            </div>
          </div> */}

          {/* Headline */}
          <h2 className="text-3xl font-bold leading-snug mb-3">
            Automate your payroll.
            <br />
            <span className="text-yellow-300">Save hours every month.</span>
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed max-w-md">
            Replace your manual Excel sheets with a modern, accurate, and
            professional payroll system built specifically for clinics and
            hospitals.
          </p>
        </div>

        {/* Feature cards */}
        <div className="px-12 pb-8">
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="bg-white/10 hover:bg-white/15 transition-colors
                           rounded-2xl p-4 border border-white/10"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                  <Icon size={16} className="text-yellow-300" />
                </div>
                <div className="text-sm font-semibold text-white leading-tight">
                  {label}
                </div>
                <div className="text-xs text-indigo-300 mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Support guidelines */}
        {/* <div className="mx-12 mb-8 bg-white/10 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-yellow-400/20 flex items-center justify-center">
              <Phone size={14} className="text-yellow-300" />
            </div>
            <h3 className="font-semibold text-white text-sm">
              Support Guidelines
            </h3>
          </div>
          <ul className="space-y-2.5">
            {SUPPORT_POINTS.map((pt, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs text-indigo-200 leading-relaxed"
              >
                <CheckCircle
                  size={13}
                  className="text-yellow-400 flex-shrink-0 mt-0.5"
                />
                {pt}
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs text-indigo-200">
            <div className="flex items-center gap-1.5">
              <Phone size={11} className="text-yellow-300" />
              <span>+91 93703 77955</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone size={11} className="text-yellow-300" />
              <span>+91 95798 45567</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-yellow-300" />
              <span>Mon–Sat 10:30 AM – 7:30 PM</span>
            </div>
          </div>
        </div> */}

        {/* Bottom — two product pills */}
        {/* <div className="mx-12 mb-12 grid grid-cols-2 gap-3">
          {[
            {
              name: "Supe Hospital",
              tag: "Heart And Diabetes Hospital And Research Centre",
              active: true,
            },
            { name: "AttendPro", tag: "Biometric Integration", active: false },
          ].map(({ name, tag, active }) => (
            <div
              key={name}
              className={`rounded-2xl p-4 border flex items-center gap-3 transition-all
                ${
                  active
                    ? "bg-white text-indigo-700 border-white shadow-lg shadow-indigo-900/30"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                ${active ? "bg-indigo-100" : "bg-white/10"}`}
              >
                <Building2
                  size={16}
                  className={active ? "text-indigo-600" : "text-indigo-200"}
                />
              </div>
              <div>
                <div
                  className={`text-sm font-bold leading-tight ${active ? "text-indigo-700" : "text-white"}`}
                >
                  {name}
                </div>
                <div
                  className={`text-xs mt-0.5 ${active ? "text-indigo-400" : "text-indigo-300"}`}
                >
                  {tag}
                </div>
              </div>
            </div>
          ))}
        </div> */}
      </div>
    </div>
  );
}
