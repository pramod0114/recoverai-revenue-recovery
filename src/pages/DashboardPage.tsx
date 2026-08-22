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
  ShieldCheck
} from 'lucide-react';
import { RevenueTrendChart } from '../components/dashboard/RevenueTrendChart';
import { InterventionDonutChart } from '../components/dashboard/InterventionDonutChart';
import { FailureReasonsCard } from '../components/dashboard/FailureReasonsCard';
import { RecentActivityFeed } from '../components/dashboard/RecentActivityFeed';
import { RecoveryCaseDetailModal } from '../components/common/RecoveryCaseDetailModal';

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
  const [dateRange, setDateRange] = useState('May 12 — May 18, 2025');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [kpiRes, trendRes, intervRes, failureRes, actRes, casesRes] = await Promise.all([
        api.getKpis(),
        api.getTrend(),
        api.getInterventionsBreakdown(),
        api.getFailureBreakdown(),
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
    loadDashboardData();
  }, []);

  const handleRunBatchDiagnostics = async () => {
    try {
      setIsDiagnosing(true);
      const res = await api.diagnoseAllRecoveryCases();
      setToastMessage(res.message || 'AI Recovery Agent analyzed and evaluated policies for all open cases.');
      await loadDashboardData();
    } catch (err: any) {
      setToastMessage(`Diagnostics error: ${err.message}`);
    } finally {
      setIsDiagnosing(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

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
    'May 12 — May 18, 2025',
    'This Quarter'
  ];

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center justify-between shadow-sm animate-in fade-in">
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
            {getGreeting()}, {user?.fullName?.split(' ')[0] || 'Pramod'} 👋
          </h1>
          <p className="text-sm text-[#667085] mt-1">
            Here's what's happening with your revenue recovery today.
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
            onClick={handleRunBatchDiagnostics}
            disabled={isDiagnosing}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
          >
            {isDiagnosing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-white" />
            )}
            <span>Run AI Diagnostics</span>
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Revenue at Risk */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
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
            <div className="flex items-center gap-1 text-[12px] text-[#DC2626] font-medium mt-1">
              <span>↑ 8.2%</span>
              <span className="text-[#98A2B3] font-normal">vs last 7 days</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            {kpis?.failedPaymentsCount || 438} failed transactions detected
          </div>
        </div>

        {/* KPI 2: Recovered Revenue */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
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
            <div className="flex items-center gap-1 text-[12px] text-[#16A34A] font-medium mt-1">
              <span>↑ 14.8%</span>
              <span className="text-[#98A2B3] font-normal">vs last 7 days</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Directly saved to merchant settlement
          </div>
        </div>

        {/* KPI 3: Recovery Rate */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Recovery Rate</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#2563EB] tracking-tight">
              {kpis?.recoveryRate ? `${kpis.recoveryRate}%` : '63.52%'}
            </div>
            <div className="flex items-center gap-1 text-[12px] text-[#16A34A] font-medium mt-1">
              <span>↑ 5.4%</span>
              <span className="text-[#98A2B3] font-normal">vs industry benchmark (41%)</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Autonomous smart dunning & retry
          </div>
        </div>

        {/* KPI 4: Active Cases */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">Active Cases</span>
            <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#D97706]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#171717] tracking-tight">
              {kpis?.activeRecoveryCases || 428}
            </div>
            <div className="flex items-center gap-1 text-[12px] text-[#D97706] font-medium mt-1">
              <span>+ 124</span>
              <span className="text-[#98A2B3] font-normal">high priority cases in queue</span>
            </div>
          </div>
          <div className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">
            Bounded workflow monitoring
          </div>
        </div>
      </div>

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueTrendChart data={trend} />
        </div>
        <div>
          <InterventionDonutChart data={interventions} />
        </div>
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
              View all 428 cases →
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

      {/* Detail Modal */}
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
