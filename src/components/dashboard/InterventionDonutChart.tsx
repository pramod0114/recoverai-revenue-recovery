import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface InterventionItem {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface InterventionDonutChartProps {
  data?: {
    totalRecovered: number;
    items: InterventionItem[];
  };
}

export const InterventionDonutChart: React.FC<InterventionDonutChartProps> = ({ data }) => {
  const defaultItems: InterventionItem[] = [
    { name: 'Retry Payment', amount: 620000, count: 245, percentage: 52.9, color: '#2563EB' },
    { name: 'Payment Reminder', amount: 310000, count: 120, percentage: 26.5, color: '#16A34A' },
    { name: 'Payment Link', amount: 142000, count: 54, percentage: 12.1, color: '#9333EA' },
    { name: 'Alternate Method', amount: 62000, count: 24, percentage: 5.3, color: '#F97316' },
    { name: 'Human Escalation', amount: 38000, count: 15, percentage: 3.2, color: '#EF4444' }
  ];

  const items = data?.items && data.items.length > 0 ? data.items : defaultItems;
  const totalAmount = data?.totalRecovered || items.reduce((sum, i) => sum + i.amount, 0);

  const formatLakhs = (val: number) => {
    return `₹${(val / 100000).toFixed(2)}L`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-[#EAECF0] rounded-xl shadow-lg text-xs space-y-1 z-50">
          <div className="font-semibold text-[#171717]">{d.name}</div>
          <div className="text-[#2563EB] font-bold">{formatLakhs(d.amount)} ({d.percentage}%)</div>
          <div className="text-[#667085]">{d.count} interventions executed</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs flex flex-col justify-between h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-[#171717]">Recovery by Intervention</h3>
        <span className="text-xs font-medium text-[#667085]">Distribution</span>
      </div>

      {/* Donut Chart with Center Text */}
      <div className="relative w-full h-[190px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={items}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={3}
              dataKey="amount"
            >
              {items.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center overlay label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-[#171717] tracking-tight">
            {formatLakhs(totalAmount)}
          </span>
          <span className="text-[11px] font-medium text-[#667085]">Total Recovered</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-1.5 pt-2 border-t border-[#EAECF0]">
        {items.slice(0, 4).map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[#475467] font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#171717]">{formatLakhs(item.amount)}</span>
              <span className="text-[11px] text-[#667085] w-10 text-right">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
