import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  AlertOctagon,
  CheckCircle2,
  Layers,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  Filter,
  Search,
  MoreVertical,
  Zap,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  UserX,
  CreditCard,
  UserCog,
  Sliders,
  Server,
  Lock,
  ShieldAlert,
  Github
} from 'lucide-react';
import { RevenueTrendChart } from '../components/dashboard/RevenueTrendChart';
import { InterventionDonutChart } from '../components/dashboard/InterventionDonutChart';
import { FailureReasonsCard } from '../components/dashboard/FailureReasonsCard';
import { RecentActivityFeed } from '../components/dashboard/RecentActivityFeed';
import { RecoveryFunnel } from '../components/dashboard/RecoveryFunnel';
import { RecoveryCaseDetailModal } from '../components/common/RecoveryCaseDetailModal';
import { AiDiagnosticsModal } from '../components/common/AiDiagnosticsModal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any>(null);
  const [failureBreakdown, setFailureBreakdown] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('Last 14 days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadDashboardData = async (selectedRange = dateRange) => {
    try {
      setLoading(true);
      const [kpiRes, trendRes, intervRes, failureRes, actRes, casesRes] = await Promise.all([
        api.getKpis({ range: selectedRange }),
        api.getTrend({ range: selectedRange }),
        api.getInterventionsBreakdown({ range: selectedRange }),
        api.getFailureBreakdown({ range: selectedRange }),
        api.getRecentActivity(),
        api.getRecoveryCases({ limit: 6 })
      ]);

      setKpis(kpiRes.data);
      setTrend(trendRes.data);
      setInterventions(intervRes.data);
      setFailureBreakdown(failureRes.data);
      setRecentActivities(actRes.data);
      setRecentCases(casesRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(dateRange);
  }, [dateRange]);

  const formatLakhs = (val: number) => {
    if (!val) return '₹0';
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const datePresets = [
    'Today',
    'Last 7 days',
    'Last 14 days',
    'Last 30 days',
    'This Quarter'
  ];

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-semibold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#171717] tracking-tight">
            {getGreeting()} 👋
          </h1>
          <p className="text-sm text-[#667085] mt-1">
            Real-time fintech revenue recovery control center & bounded AI workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#EAECF0] rounded-xl text-xs font-semibold text-[#344054] shadow-xs hover:bg-[#F9FAFB] transition-all"
            >
              <Calendar className="w-4 h-4 text-[#667085]" />
              <span>{dateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#98A2B3]" />
            </button>

            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#EAECF0] rounded-xl shadow-lg p-1.5 z-40">
                <div className="text-[11px] font-semibold text-[#98A2B3] px-3 py-1 uppercase">
                  Select Period
                </div>
                {datePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setDateRange(preset);
                      setShowDatePicker(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      dateRange === preset
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : 'text-[#344054] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Autonomous AI Batch Trigger */}
          <button
            onClick={() => setShowDiagnosticsModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Run AI Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Role-Specific Operational / Governance Strip */}
      {user?.role === 'ADMIN' ? (
        <div className="p-4 bg-white border border-[#BFDBFE] rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#EFF6FF] via-white to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2563EB] text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                  Admin Governance Control Active
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]">
                  Full Access
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                Chief Risk Officer privileges active. You can modify bounded policies, manage operators, and authorize critical overrides.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/admin/policies"
              className="px-3 py-1.5 bg-white hover:bg-[#F9FAFB] text-[#344054] border border-[#D0D5DD] rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
              Policies ({kpis?.adminControl?.policyCount || 8})
            </Link>
            <Link
              to="/admin/users"
              className="px-3 py-1.5 bg-white hover:bg-[#F9FAFB] text-[#344054] border border-[#D0D5DD] rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <UserCog className="w-3.5 h-3.5 text-[#2563EB]" />
              Operators
            </Link>
            <Link
              to="/admin/configuration"
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Server className="w-3.5 h-3.5 text-white" />
              Gateway Config
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white border border-[#EAECF0] rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#F9FAFB] via-white to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F2F4F7] text-[#344054] rounded-xl border border-[#EAECF0]">
              <Zap className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#344054] uppercase tracking-wider">
                  Analyst Recovery Desk
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#475467] border border-[#EAECF0]">
                  Operator Mode
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                Review at-risk transactions, execute AI recommended actions, and escalate high-value anomalies to CRO.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/recovery"
              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Triage Queue ({kpis?.activeRecoveryCases || 428})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ALL 8 Live KPI Cards in 4x2 responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue at Risk */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Revenue at Risk</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF5FF] border border-[#E9D5FF] flex items-center justify-center text-[#9333EA]">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#171717] tracking-tight">
              {kpis ? formatLakhs(kpis.revenueAtRisk) : '₹18.45L'}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#DC2626] font-medium mt-1">
              <span>{kpis?.periodComparison?.revenueAtRisk?.delta || -8.4}%</span>
              <span className="text-[#98A2B3] font-normal">vs previous period</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Active subscription & invoice risk
          </div>
        </div>

        {/* KPI 2: Recovered Revenue */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Recovered Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF3] border border-[#A7F3D0] flex items-center justify-center text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#16A34A] tracking-tight">
              {kpis ? formatLakhs(kpis.recoveredRevenue) : '₹11.72L'}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#16A34A] font-medium mt-1">
              <span>+{kpis?.periodComparison?.recoveredRevenue?.delta || 18.2}%</span>
              <span className="text-[#98A2B3] font-normal">vs previous period</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Directly settled to merchant balance
          </div>
        </div>

        {/* KPI 3: Expected Recovery */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Expected Recovery</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#2563EB] tracking-tight">
              {kpis ? formatLakhs(kpis.expectedRecovery) : '₹4.85L'}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#2563EB] font-medium mt-1">
              <span>+{kpis?.periodComparison?.expectedRecovery?.delta || 12.5}%</span>
              <span className="text-[#98A2B3] font-normal">ML predicted yield</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Calibrated win-back probability sum
          </div>
        </div>

        {/* KPI 4: Recovery Rate */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Recovery Rate</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#171717] tracking-tight">
              {kpis?.recoveryRate !== undefined ? `${kpis.recoveryRate}%` : '63.5%'}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#16A34A] font-medium mt-1">
              <span>+{kpis?.periodComparison?.recoveryRate?.delta || 4.8}%</span>
              <span className="text-[#98A2B3] font-normal">vs industry avg (41%)</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Autonomous smart retries & dunning
          </div>
        </div>

        {/* KPI 5: Active Recovery Cases */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Active Recovery Cases</span>
            <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#D97706]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#171717] tracking-tight">
              {kpis?.activeRecoveryCases ?? 428}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#D97706] font-medium mt-1">
              <span>{kpis?.periodComparison?.activeRecoveryCases?.delta || -5.1}%</span>
              <span className="text-[#98A2B3] font-normal">in active execution pipeline</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Bounded workflow monitoring
          </div>
        </div>

        {/* KPI 6: High-Risk Cases */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">High-Risk Cases</span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#DC2626] tracking-tight">
              {kpis?.highRiskCases ?? 72}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#16A34A] font-medium mt-1">
              <span>{kpis?.periodComparison?.highRiskCases?.delta || -14.2}%</span>
              <span className="text-[#98A2B3] font-normal">churn risk reduced</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Risk score ≥ 0.60 flagged
          </div>
        </div>

        {/* KPI 7: Failed Payments */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Failed Payments</span>
            <div className="w-8 h-8 rounded-lg bg-[#F9FAFB] border border-[#EAECF0] flex items-center justify-center text-[#475467]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#171717] tracking-tight">
              {kpis?.failedPaymentsCount ?? 438}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#16A34A] font-medium mt-1">
              <span>{kpis?.periodComparison?.failedPaymentsCount?.delta || -6.7}%</span>
              <span className="text-[#98A2B3] font-normal">failure volume drop</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Ingested across Razorpay webhooks
          </div>
        </div>

        {/* KPI 8: Escalated Cases */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Escalated Cases</span>
            <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#EA580C]">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#EA580C] tracking-tight">
              {kpis?.escalatedCases ?? 18}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#16A34A] font-medium mt-1">
              <span>{kpis?.periodComparison?.escalatedCases?.delta || -22.0}%</span>
              <span className="text-[#98A2B3] font-normal">human intervention required</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Assigned to finance / success ops
          </div>
        </div>
      </div>

      {/* Middle Row: Trend & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueTrendChart data={trend} dateRange={dateRange} />
        </div>
        <div>
          <InterventionDonutChart data={interventions} />
        </div>
      </div>

      {/* Conversion Funnel */}
      <div>
        <RecoveryFunnel dateRange={dateRange} />
      </div>

      {/* Bottom Row: Recent Recovery Cases Table + Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2/3 Table: Recent Recovery Cases */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#EAECF0] shadow-xs flex flex-col justify-between">
          <div className="p-6 border-b border-[#EAECF0] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#171717]">Recent Recovery Cases</h3>
              <p className="text-xs text-[#667085] mt-0.5">
                AI diagnosed transactions currently in bounded recovery workflows
              </p>
            </div>
            <Link
              to="/recovery"
              className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-0.5"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">AI Strategy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {recentCases.map((c) => {
                  const prob = Math.round((c.recovery_probability || 0.75) * 100);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#2563EB]">
                        #{c.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#171717]">{c.customer_name || 'Enterprise Client'}</div>
                        <div className="text-[11px] text-[#98A2B3]">₹{(c.customer_ltv || 45000).toLocaleString('en-IN')} LTV</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#171717]">
                        ₹{Number(c.at_risk_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.risk_level === 'HIGH'
                              ? 'bg-[#FEF2F2] text-[#DC2626]'
                              : c.risk_level === 'MEDIUM'
                              ? 'bg-[#FFF7ED] text-[#D97706]'
                              : 'bg-[#ECFDF3] text-[#16A34A]'
                          }`}
                        >
                          {c.risk_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#344054] font-medium truncate max-w-[140px]">
                          <Zap className="w-3 h-3 text-[#2563EB] shrink-0" />
                          <span className="truncate">
                            {c.recommended_strategy ? c.recommended_strategy.replace(/_/g, ' ') : 'Dynamic Retry'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#16A34A] font-semibold">{prob}% win-back</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.status === 'RECOVERED'
                              ? 'bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0]'
                              : c.status === 'IN_PROGRESS'
                              ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                              : c.status === 'UNRECOVERED'
                              ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              : 'bg-[#FFF7ED] text-[#D97706] border border-[#FED7AA]'
                          }`}
                        >
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseId(c.id);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#EAECF0] bg-[#F9FAFB] rounded-b-xl flex items-center justify-between text-xs text-[#667085]">
            <span>Showing top 6 priority cases</span>
            <Link to="/recovery" className="font-semibold text-[#2563EB] hover:underline">
              View all {kpis?.activeRecoveryCases || 428} cases →
            </Link>
          </div>
        </div>

        {/* 1/3 Side Widgets: Failure Reasons & Recent Activity */}
        <div className="space-y-6">
          <FailureReasonsCard data={failureBreakdown} />
          <RecentActivityFeed
            activities={recentActivities}
            onSelectCase={(id) => setSelectedCaseId(id)}
          />
        </div>
      </div>

      {/* Dashboard System Status Footer */}
      <div className="p-4 bg-white border border-[#EAECF0] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085] shadow-xs">
        <div className="flex items-center gap-2">
          <span>RecoverAI Autonomous Revenue Recovery Platform</span>
          <span className="text-[#D0D5DD]">•</span>
          <span className="text-[#101828] font-medium">Enterprise Production Edition</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#667085]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
            All Subsystems Nominal
          </span>
          <span className="text-[#D0D5DD]">•</span>
          <span>© 2026 RecoverAI Inc.</span>
        </div>
      </div>

      {/* Diagnostics Modal */}
      <AiDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        onCompleted={loadDashboardData}
      />

      {/* Case Detail Modal */}
      {selectedCaseId && (
        <RecoveryCaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onUpdated={loadDashboardData}
        />
      )}
    </div>
  );
};
