import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AccessRestrictedProps {
  requiredRole?: string;
  pageName?: string;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  requiredRole = 'ADMIN',
  pageName
}) => {
  const navigate = useNavigate();
  const { user, quickLoginAs } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white max-w-lg w-full rounded-2xl border border-[#EAECF0] shadow-sm p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
            <Lock className="w-3 h-3" />
            <span>HTTP 403 • Access Restricted</span>
          </div>
          <h2 className="text-xl font-bold text-[#171717] tracking-tight">
            {pageName ? `Restricted: ${pageName}` : 'Privilege Level Insufficient'}
          </h2>
          <p className="text-xs text-[#667085] max-w-sm mx-auto leading-relaxed">
            You are currently signed in as <span className="font-semibold text-[#171717]">{user?.fullName || 'Analyst'}</span> ({user?.role || 'ANALYST'}). This section is strictly restricted to authorized <span className="font-semibold text-[#DC2626]">{requiredRole}</span> roles with governance authority.
          </p>
        </div>

        <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] text-xs text-left space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#98A2B3]">
            Access Governance Policy
          </div>
          <div className="flex items-center justify-between text-[#344054]">
            <span>Current Role:</span>
            <span className="font-mono font-semibold px-2 py-0.5 rounded bg-white border border-[#EAECF0]">
              {user?.role || 'ANALYST'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#344054]">
            <span>Required Role:</span>
            <span className="font-mono font-semibold px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]">
              {requiredRole}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={() => quickLoginAs('ADMIN')}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch to Admin Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
