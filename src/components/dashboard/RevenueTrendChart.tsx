import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Info, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

interface RevenueTrendChartProps {
  data?: any[];
  dateRange?: string;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data: initialData, dateRange }) => {
  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [trendData, setTrendData] = useState<any[]>(initialData || []);
  const [loading, setLoading] = useState(false);

  // Sync initialData when parent loads data for new dateRange
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setTrendData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    let isMounted = true;
    const fetchTrend = async () => {
      try {
        setLoading(true);
        const res = await api.getTrend({ timeframe: timeframe.toLowerCase(), range: dateRange });
        if (isMounted && res.data && res.data.length > 0) {
          setTrendData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch trend data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTrend();
    return () => {
      isMounted = false;
    };
  }, [timeframe, dateRange]);

  const defaultDailyFallback = [
    { date: '2025-05-05', label: '05-05', atRisk: 120000, expectedRecovery: 85000, recovered: 76000 },
    { date: '2025-05-06', label: '05-06', atRisk: 145000, expectedRecovery: 102000, recovered: 92000 },
    { date: '2025-05-07', label: '05-07', atRisk: 135000, expectedRecovery: 95000, recovered: 87000 },
    { date: '2025-05-08', label: '05-08', atRisk: 160000, expectedRecovery: 115000, recovered: 104000 },
    { date: '2025-05-09', label: '05-09', atRisk: 180000, expectedRecovery: 128000, recovered: 115000 },
    { date: '2025-05-10', label: '05-10', atRisk: 170000, expectedRecovery: 120000, recovered: 108000 },
    { date: '2025-05-11', label: '05-11', atRisk: 195000, expectedRecovery: 138000, recovered: 125000 },
    { date: '2025-05-12', label: '05-12', atRisk: 210000, expectedRecovery: 152000, recovered: 138000 },
    { date: '2025-05-13', label: '05-13', atRisk: 190000, expectedRecovery: 135000, recovered: 122000 },
    { date: '2025-05-14', label: '05-14', atRisk: 225000, expectedRecovery: 162000, recovered: 148000 },
    { date: '2025-05-15', label: '05-15', atRisk: 240000, expectedRecovery: 175000, recovered: 159000 },
    { date: '2025-05-16', label: '05-16', atRisk: 260000, expectedRecovery: 188000, recovered: 172000 },
    { date: '2025-05-17', label: '05-17', atRisk: 250000, expectedRecovery: 180000, recovered: 165000 },
    { date: '2025-05-18', label: '05-18', atRisk: 275000, expectedRecovery: 198000, recovered: 182000 }
  ];

  const sourceData = trendData && trendData.length > 0 ? trendData : defaultDailyFallback;

  // Format data for Recharts
  const formattedData = sourceData.map((d) => {
    let cleanLabel = d.label || d.date || '';
    if (cleanLabel.length === 10 && cleanLabel.startsWith('202')) {
      cleanLabel = cleanLabel.slice(5); // "05-12"
    }
    return {
      ...d,
      formattedDate: cleanLabel,
      fullTitle: d.date || d.label || cleanLabel,
      atRiskLakhs: Number(((d.atRisk || 0) / 100000).toFixed(2)),
      expectedLakhs: Number(((d.expectedRecovery || d.atRisk * 0.65 || 0) / 100000).toFixed(2)),
      recoveredLakhs: Number(((d.recovered || 0) / 100000).toFixed(2))
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      const atRiskVal = payload.find((p: any) => p.dataKey === 'atRiskLakhs')?.value || item?.atRiskLakhs || 0;
      const expectedVal = payload.find((p: any) => p.dataKey === 'expectedLakhs')?.value || item?.expectedLakhs || 0;
      const recoveredVal = payload.find((p: any) => p.dataKey === 'recoveredLakhs')?.value || item?.recoveredLakhs || 0;

      return (
        <div className="bg-white p-3.5 border border-[#EAECF0] rounded-xl shadow-xl text-xs space-y-2 z-50 min-w-[210px]">
          <div className="font-semibold text-[#171717] pb-1 border-b border-[#EAECF0]">
            {item?.fullTitle || label}
          </div>
          <div className="flex items-center justify-between gap-4 text-[#16A34A]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
              Recovered Revenue:
            </span>
            <span className="font-bold">₹{recoveredVal}L</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#2563EB]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
              Expected Recovery:
            </span>
            <span className="font-bold">₹{expectedVal}L</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#667085]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#93C5FD]"></span>
              Revenue at Risk:
            </span>
            <span className="font-bold">₹{atRiskVal}L</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs flex flex-col justify-between h-[380px] w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#171717]">Revenue Recovery Trend</h3>
          <div className="group relative cursor-pointer">
            <Info className="w-4 h-4 text-[#98A2B3] hover:text-[#667085]" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-[#171717] text-white text-[11px] rounded-lg shadow-lg text-center z-20 leading-snug">
              Compare total at-risk volume, AI predicted yield, and settled recoveries.
            </div>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-[#F2F4F7] p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
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

      {/* Chart container with fixed height */}
      <div className="w-full h-[240px] relative shrink-0">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
          </div>
        )}
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.15} />
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
              dataKey="expectedLakhs"
              name="Expected Recovery"
              stroke="#2563EB"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorExpected)"
            />
            <Area
              type="monotone"
              dataKey="recoveredLakhs"
              name="Recovered Revenue"
              stroke="#16A34A"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRecovered)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-[#EAECF0] text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#93C5FD]"></span>
          <span className="text-[#667085]">Revenue at Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] border border-dashed border-[#1D4ED8]"></span>
          <span className="font-medium text-[#2563EB]">Expected Recovery</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
          <span className="font-semibold text-[#171717]">Recovered Revenue</span>
        </div>
      </div>
    </div>
  );
};
