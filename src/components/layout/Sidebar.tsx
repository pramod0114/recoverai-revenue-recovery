import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  CreditCard,
  Zap,
  BarChart3,
  Users,
  FileSpreadsheet,
  Cpu,
  History,
  Activity,
  Settings,
  UserCog,
  Sliders,
  Server,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  adminOnly?: boolean;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'RECOVERY WORKFLOWS',
      items: [
        { path: '/recovery', label: 'Recovery Cases', icon: Target, badge: '428' },
        { path: '/payments', label: 'Failed Payments', icon: CreditCard },
        { path: '/interventions', label: 'Interventions', icon: Zap }
      ]
    },
    {
      title: 'ANALYTICS & INTELLIGENCE',
      items: [
        { path: '/analytics', label: 'Revenue Analytics', icon: BarChart3 },
        { path: '/customers', label: 'Customers', icon: Users },
        { path: '/reports', label: 'Reports', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'SYSTEM & MONITORING',
      items: [
        { path: '/ai-activity', label: 'AI Activity', icon: Cpu, badge: 'Live' },
        { path: '/audit', label: 'Audit Trail', icon: History },
        { path: '/system-health', label: 'System Health', icon: Activity }
      ]
    },
    ...(isAdmin
      ? [
          {
            title: 'ADMINISTRATION & GOVERNANCE',
            adminOnly: true,
            items: [
              { path: '/admin/users', label: 'User Management', icon: UserCog },
              { path: '/admin/policies', label: 'Recovery Policies', icon: Sliders },
              { path: '/admin/configuration', label: 'System Configuration', icon: Server }
            ]
          }
        ]
      : []),
    {
      title: 'PREFERENCES',
      items: [
        { path: '/settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#EAECF0] flex flex-col justify-between shrink-0 min-h-[calc(100vh-64px)] select-none">
      <div className="p-4 space-y-6">
        {/* Navigation Sections */}
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-[#98A2B3] uppercase">
                {section.title}
              </span>
              {section.adminOnly && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  ADMIN
                </span>
              )}
            </div>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                          : 'text-[#475467] hover:text-[#171717] hover:bg-[#F9FAFB]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-[#2563EB]' : 'text-[#667085]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                              item.badge === 'Live'
                                ? 'bg-[#ECFDF3] text-[#16A34A]'
                                : isActive
                                ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                                : 'bg-[#F2F4F7] text-[#475467]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Status Box */}
      <div className="p-4 border-t border-[#EAECF0] space-y-2.5 bg-[#F9FAFB]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
            </span>
            <span className="text-[12px] font-semibold text-[#101828]">Razorpay Live Gateway</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#ECFDF5] text-[#027A48] rounded border border-[#A7F3D0]">
            ACTIVE
          </span>
        </div>

        <div className="text-[11px] text-[#667085] leading-snug">
          Autonomous recovery engine connected with real-time stream active.
        </div>

        <div className="pt-2 border-t border-[#EAECF0] flex items-center justify-between text-[10px] text-[#98A2B3]">
          <span className="flex items-center gap-1 text-[#16A34A] font-medium">
            <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
            Guardrails Active
          </span>
          <span>© 2026 RecoverAI</span>
        </div>
      </div>
    </aside>
  );
};
