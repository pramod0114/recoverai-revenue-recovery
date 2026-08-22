import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface FailureBreakdownItem {
  category: string;
  count: number;
  amount: number;
  recoveredAmount: number;
  recoveryRate: number;
}

interface FailureReasonsCardProps {
  data?: FailureBreakdownItem[];
}

export const FailureReasonsCard: React.FC<FailureReasonsCardProps> = ({ data }) => {
  const defaultItems = [
    { category: 'Insufficient Funds', percentage: 42, color: '#2563EB', count: 184 },
    { category: 'Network / Gateway Timeout', percentage: 26, color: '#16A34A', count: 114 },
    { category: 'Expired Mandate / Card', percentage: 18, color: '#D97706', count: 79 },
    { category: 'Bank Security Decline', percentage: 14, color: '#DC2626', count: 61 }
  ];

  const totalCount = data ? data.reduce((acc, curr) => acc + curr.count, 0) : 438;

  const items = data && data.length > 0
    ? data.slice(0, 4).map((d, i) => ({
        category: d.category.replace(/_/g, ' '),
        percentage: totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 25,
        color: ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#9333EA'][i % 5],
        count: d.count
      }))
    : defaultItems;

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#171717]">Failure Reasons</h3>
        <Link
          to="/payments"
          className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => (
          <div key={item.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#344054] truncate">{item.category}</span>
              <span className="font-semibold text-[#171717]">
                {item.percentage}% <span className="text-[11px] text-[#98A2B3] font-normal">({item.count})</span>
              </span>
            </div>
            <div className="w-full bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
