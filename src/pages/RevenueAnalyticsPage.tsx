import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  Download,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const RevenueAnalyticsPage: React.FC = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [failureBreakdown, setFailureBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [kRes, tRes, fRes] = await Promise.all([
          api.getKpis(),
          api.getTrend(),
          api.getFailureBreakdown()
        ]);
        setKpis(kRes.data);
        setTrend(tRes.data);
        setFailureBreakdown(fRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatLakhs = (val: number) => {
    if (!val) return '₹0';
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const paymentMethodData = [
    { method: 'UPI AutoPay', recovered: 480000, atRisk: 620000, rate: 77.4 },
    { method: 'Credit Card', recovered: 340000, atRisk: 580000, rate: 58.6 },
    { method: 'Debit Mandate', recovered: 220000, atRisk: 390000, rate: 56.4 },
    { method: 'Netbanking', recovered: 132000, atRisk: 255000, rate: 51.7 }
  ];

  const customerTierData = [
    { tier: 'Enterprise (>₹1L)', recovered: 560000, percentage: 47.8, color: '#2563EB' },
    { tier: 'Mid-Market (₹25k-₹1L)', recovered: 380000, percentage: 32.4, color: '#16A34A' },
    { tier: 'Growth SMB (₹5k-₹25k)', recovered: 152000, percentage: 13.0, color: '#9333EA' },
    { tier: 'Starter (<₹5k)', recovered: 80000, percentage: 6.8, color: '#F97316' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
            Revenue Analytics & Recovery Yield
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Deep financial telemetry on recovered volume, win-back velocity, and cohort retention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs">
          <div className="text-xs font-semibold text-[#667085]">Total Processed Volume</div>
          <div className="text-2xl font-bold text-[#171717] mt-1">
            {formatLakhs(kpis?.totalProcessedVolume || 14850000)}
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-1">
            5,000 synthetic test txns
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs">
          <div className="text-xs font-semibold text-[#667085]">Total Recovered Revenue</div>
          <div className="text-2xl font-bold text-[#16A34A] mt-1">
            {formatLakhs(kpis?.recoveredRevenue || 1172000)}
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-1">
            +63.5% autonomous recovery rate
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs">
          <div className="text-xs font-semibold text-[#667085]">Average Win-Back Time</div>
          <div className="text-2xl font-bold text-[#2563EB] mt-1">
            28.4 mins
          </div>
          <div className="text-[11px] text-[#667085] mt-1">
            vs 48 hrs for manual support
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs">
          <div className="text-xs font-semibold text-[#667085]">Agent ROI Multiplier</div>
          <div className="text-2xl font-bold text-[#9333EA] mt-1">
            18.2x
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-1">
            Zero added support overhead
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Yield */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#171717]">Recovery Rate by Payment Method</h3>
            <p className="text-xs text-[#667085]">Win-back rate across UPI AutoPay, Cards & Mandates</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F4F7" />
                <XAxis dataKey="method" axisLine={false} tickLine={false} tick={{ fill: '#98A2B3', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#98A2B3', fontSize: 11 }} tickFormatter={(v) => `₹${v / 100000}L`} />
                <Tooltip />
                <Legend />
                <Bar dataKey="atRisk" name="At Risk" fill="#BFDBFE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recovered" name="Recovered" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Tier Segmentation */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#171717]">Recovered Value by Customer Tier</h3>
            <p className="text-xs text-[#667085]">High LTV accounts yield 80%+ of total win-back capital</p>
          </div>
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={customerTierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="recovered"
                  paddingAngle={3}
                >
                  {customerTierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => formatLakhs(Number(val))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAECF0] text-xs">
            {customerTierData.map((t) => (
              <div key={t.tier} className="flex items-center justify-between p-1.5 rounded-md bg-[#F9FAFB]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-[#344054] truncate">{t.tier}</span>
                </div>
                <span className="font-semibold text-[#171717]">{t.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
