import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { DailyTrendItem } from '../../types';

interface TrendChartProps {
  data: DailyTrendItem[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: d.date.slice(5),
    atRiskK: Math.round(d.atRisk / 1000),
    recoveredK: Math.round(d.recovered / 1000)
  }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="text-slate-300 font-semibold mb-1">Date: {label}</p>
          <p className="text-rose-400">
            Revenue at Risk: ₹{(payload[0]?.value * 1000 || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-emerald-400">
            Recovered: ₹{(payload[1]?.value * 1000 || 0).toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis dataKey="formattedDate" stroke="#64748B" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => `₹${val}k`}
          />
          <Tooltip content={customTooltip} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
          />
          <Area
            type="monotone"
            dataKey="atRiskK"
            name="Revenue at Risk (k)"
            stroke="#F43F5E"
            fillOpacity={1}
            fill="url(#colorAtRisk)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="recoveredK"
            name="Recovered Revenue (k)"
            stroke="#10B981"
            fillOpacity={1}
            fill="url(#colorRecovered)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
