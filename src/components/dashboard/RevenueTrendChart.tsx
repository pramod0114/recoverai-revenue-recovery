import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Info, Calendar } from 'lucide-react';

interface RevenueTrendChartProps {
  data: any[];
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data }) => {
  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');

  // Format data for chart
  const formattedData = (data && data.length > 0)
    ? data.map((d) => ({
        ...d,
        formattedDate: d.date ? d.date.slice(5) : '',
        atRiskLakhs: Number((d.atRisk / 100000).toFixed(2)),
        recoveredLakhs: Number((d.recovered / 100000).toFixed(2))
      }))
    : [
        { date: '2025-05-12', formattedDate: '05-12', atRisk: 120000, recovered: 78000, atRiskLakhs: 1.2, recoveredLakhs: 0.78 },
        { date: '2025-05-13', formattedDate: '05-13', atRisk: 145000, recovered: 92000, atRiskLakhs: 1.45, recoveredLakhs: 0.92 },
        { date: '2025-05-14', formattedDate: '05-14', atRisk: 180000, recovered: 115000, atRiskLakhs: 1.8, recoveredLakhs: 1.15 },
        { date: '2025-05-15', formattedDate: '05-15', atRisk: 160000, recovered: 108000, atRiskLakhs: 1.6, recoveredLakhs: 1.08 },
        { date: '2025-05-16', formattedDate: '05-16', atRisk: 210000, recovered: 145000, atRiskLakhs: 2.1, recoveredLakhs: 1.45 },
        { date: '2025-05-17', formattedDate: '05-17', atRisk: 195000, recovered: 138000, atRiskLakhs: 1.95, recoveredLakhs: 1.38 },
        { date: '2025-05-18', formattedDate: '05-18', atRisk: 240000, recovered: 162000, atRiskLakhs: 2.4, recoveredLakhs: 1.62 }
      ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-[#EAECF0] rounded-xl shadow-lg text-xs space-y-1.5 z-50">
          <div className="font-semibold text-[#171717] pb-1 border-b border-[#EAECF0]">
            {payload[0]?.payload?.date || label}
          </div>
          <div className="flex items-center justify-between gap-4 text-[#2563EB]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
              Recovered Revenue:
            </span>
            <span className="font-bold">₹{payload[1]?.value || payload[0]?.value}L</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#667085]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#93C5FD]"></span>
              Revenue at Risk:
            </span>
            <span className="font-bold">₹{payload[0]?.value}L</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs flex flex-col justify-between h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#171717]">Revenue Recovery Trend</h3>
          <div className="group relative cursor-pointer">
            <Info className="w-4 h-4 text-[#98A2B3] hover:text-[#667085]" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-[#171717] text-white text-[11px] rounded-lg shadow-lg text-center z-20">
              Comparison of total failed volume vs autonomous AI win-backs.
            </div>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-[#F2F4F7] p-1 rounded-lg text-xs font-medium">
          {(['Daily', 'Weekly', 'Monthly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                timeframe === t
                  ? 'bg-white text-[#171717] font-semibold shadow-2xs'
                  : 'text-[#667085] hover:text-[#171717]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#93C5FD" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F4F7" />
            <XAxis
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#98A2B3', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#98A2B3', fontSize: 11 }}
              tickFormatter={(val) => `₹${val}L`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="atRiskLakhs"
              name="Revenue at Risk"
              stroke="#93C5FD"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAtRisk)"
            />
            <Area
              type="monotone"
              dataKey="recoveredLakhs"
              name="Recovered Revenue"
              stroke="#2563EB"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRecovered)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 border-t border-[#EAECF0] text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#93C5FD]"></span>
          <span className="text-[#667085]">Revenue at Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
          <span className="font-semibold text-[#171717]">Recovered Revenue</span>
        </div>
      </div>
    </div>
  );
};
