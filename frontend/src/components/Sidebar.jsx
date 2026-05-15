import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, CalendarDays, DollarSign,
  FileBarChart, LogOut, Building2, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',  roles: ['admin','hr','employee'] },
  { to: '/employees',  icon: Users,           label: 'Employees',  roles: ['admin','hr'] },
  { to: '/attendance', icon: CalendarDays,    label: 'Attendance', roles: ['admin','hr','employee'] },
  { to: '/payroll',    icon: DollarSign,      label: 'Payroll',    roles: ['admin','hr'] },
  { to: '/reports',    icon: FileBarChart,    label: 'Reports',    roles: ['admin','hr'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800 h-16">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">Supe Hospital Payroll</div>
            <div className="text-xs text-slate-500 truncate">Heart & Diabetes Centre</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0">
          <ChevronRight size={14} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.filter(n => n.roles.includes(user?.role)).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? label : ''}>
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
            </div>
          </div>
        )}
        <button onClick={logout}
          className={`nav-item text-red-400 hover:text-red-300 hover:bg-red-900/20 w-full ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Sign out' : ''}>
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
