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
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    title: 'RECOVERY',
    items: [
      { path: '/recovery', label: 'Recovery Cases', icon: Target, badge: '428' },
      { path: '/payments', label: 'Failed Payments', icon: CreditCard },
      { path: '/interventions', label: 'Interventions', icon: Zap }
    ]
  },
  {
    title: 'ANALYTICS',
    items: [
      { path: '/analytics', label: 'Revenue Analytics', icon: BarChart3 },
      { path: '/customers', label: 'Customers', icon: Users },
      { path: '/reports', label: 'Reports', icon: FileSpreadsheet }
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { path: '/ai-activity', label: 'AI Activity', icon: Cpu, badge: 'Live' },
      { path: '/audit', label: 'Audit Trail', icon: History },
      { path: '/system-health', label: 'System Health', icon: Activity },
      { path: '/settings', label: 'Settings', icon: Settings }
    ]
  }
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-[#EAECF0] flex flex-col justify-between shrink-0 min-h-[calc(100vh-64px)] select-none">
      <div className="p-4 space-y-6">
        {/* Navigation Sections */}
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-[#98A2B3] px-3 mb-1.5 uppercase">
              {section.title}
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
      <div className="p-4 border-t border-[#EAECF0] space-y-3 bg-[#F9FAFB]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
            </span>
            <span className="text-[12px] font-medium text-[#344054]">Razorpay Live Sync</span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] rounded border border-[#BFDBFE]">
            TEST MODE
          </span>
        </div>

        <div className="text-[11px] text-[#667085] leading-snug">
          Connected to synthetic gateway with 5,000 active transactions.
        </div>

        <div className="text-[10px] text-[#98A2B3] pt-1">
          © 2025 RecoverAI. All rights reserved.
        </div>
      </div>
    </aside>
  );
};
