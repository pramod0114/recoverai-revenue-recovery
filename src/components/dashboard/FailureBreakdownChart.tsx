import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { FailureBreakdownItem } from '../../types';

interface FailureBreakdownChartProps {
  data: FailureBreakdownItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  INSUFFICIENT_FUNDS: '#38BDF8',
  BANK_DOWNTIME: '#F59E0B',
  EXPIRED_CARD: '#A855F7',
  AUTHENTICATION_DROP: '#EC4899',
  CUSTOMER_ABANDONMENT: '#F43F5E',
  LIMIT_EXCEEDED: '#64748B',
  FRAUD_SUSPICION: '#EF4444',
  OTHER: '#94A3B8'
};

export const FailureBreakdownChart: React.FC<FailureBreakdownChartProps> = ({ data }) => {
  const sorted = data.slice().sort((a, b) => b.count - a.count);

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as FailureBreakdownItem;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="text-slate-200 font-semibold mb-1">{item.category.replace(/_/g, ' ')}</p>
          <p className="text-slate-300">Failure Count: {item.count.toLocaleString()}</p>
          <p className="text-rose-400">Total at Risk: ₹{item.amount.toLocaleString('en-IN')}</p>
          <p className="text-emerald-400">Recovery Rate: {item.recoveryRate}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
          <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
          <YAxis
            type="category"
            dataKey="category"
            stroke="#64748B"
            fontSize={10}
            tickLine={false}
            tickFormatter={(val) => val.split('_')[0]}
            width={70}
          />
          <Tooltip content={customTooltip} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CATEGORY_COLORS[entry.category] || '#38BDF8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
