import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Zap, ShieldCheck, ArrowRight, Lock, Mail, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickLoginAs } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@recoverai.io');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'ADMIN' | 'ANALYST') => {
    try {
      setLoading(true);
      setError(null);
      await quickLoginAs(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB] text-white shadow-md mb-2">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#171717] tracking-tight">
            RecoverAI Agent Console
          </h1>
          <p className="text-xs text-[#667085]">
            Razorpay Buildathon Track 03 • AI Revenue Recovery Agent
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 rounded-2xl border border-[#EAECF0] shadow-sm space-y-6">
          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECDCA] text-[#DC2626] rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  placeholder="admin@recoverai.io"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Access for Evaluation */}
          <div className="pt-4 border-t border-[#EAECF0] space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3] text-center">
              Quick Role Test Logins
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="p-2.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-left transition-colors"
              >
                <div className="font-semibold text-xs text-[#1D4ED8]">Admin Role</div>
                <div className="text-[10px] text-[#2563EB]">Full Autonomous Control</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ANALYST')}
                className="p-2.5 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] hover:bg-[#F2F4F7] text-left transition-colors"
              >
                <div className="font-semibold text-xs text-[#344054]">Analyst Role</div>
                <div className="text-[10px] text-[#667085]">Audit & Review Access</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-[#98A2B3]">
          RecoverAI Production Foundation • Razorpay Track 03
        </div>
      </div>
    </div>
  );
};
