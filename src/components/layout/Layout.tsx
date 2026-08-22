import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ShieldCheck, Info } from 'lucide-react';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#171717] flex flex-col font-sans">
      {/* Test Mode Safety Ribbon */}
      <div className="bg-[#171717] text-white px-4 py-1.5 text-[11px] font-medium flex items-center justify-between border-b border-[#262626]">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-[#D97706] text-white font-bold text-[10px] uppercase tracking-wider">
              Test Mode
            </span>
            <span className="text-[#D4D4D4] hidden sm:inline">
              Operating in Razorpay Test Sandbox & Bounded Simulation. No real money or payment accounts are charged.
            </span>
            <span className="text-[#D4D4D4] sm:hidden">
              Razorpay Sandbox Active (Test Mode)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[#A3A3A3] text-[11px] shrink-0">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              Guardrails Enforced
            </span>
          </div>
        </div>
      </div>

      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-[1440px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

