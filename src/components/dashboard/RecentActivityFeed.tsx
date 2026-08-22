import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, RefreshCw, Send, ArrowRight, ShieldAlert, ChevronRight } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  caseId: string;
  description: string;
  timeAgo: string;
  timestamp?: string;
}

interface RecentActivityFeedProps {
  activities?: ActivityItem[];
  onSelectCase?: (caseId: string) => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  onSelectCase
}) => {
  const defaultActivities: ActivityItem[] = [
    {
      id: 'act_1',
      type: 'RECOVERED',
      title: '₹4,999 recovered',
      caseId: 'RC-10291',
      description: 'Auto-retry executed during customer pay cycle',
      timeAgo: '2 min ago'
    },
    {
      id: 'act_2',
      type: 'ESCALATED',
      title: 'Case escalated to human',
      caseId: 'RC-10289',
      description: 'High LTV account with recurring gateway downtime',
      timeAgo: '15 min ago'
    },
    {
      id: 'act_3',
      type: 'RETRY_INITIATED',
      title: 'Retry initiated',
      caseId: 'RC-10288',
      description: 'Off-peak intelligent debit scheduled',
      timeAgo: '22 min ago'
    },
    {
      id: 'act_4',
      type: 'REMINDER_SENT',
      title: 'Payment reminder sent',
      caseId: 'RC-10290',
      description: 'WhatsApp 1-click UPI pay link dispatched',
      timeAgo: '32 min ago'
    }
  ];

  const list = activities && activities.length > 0 ? activities : defaultActivities;

  const getIcon = (type: string) => {
    switch (type) {
      case 'RECOVERED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />;
      case 'ESCALATED':
        return <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />;
      case 'REMINDER_SENT':
        return <Send className="w-3.5 h-3.5 text-[#9333EA]" />;
      default:
        return <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'RECOVERED':
        return 'bg-[#ECFDF3] border-[#A7F3D0]';
      case 'ESCALATED':
        return 'bg-[#FEF2F2] border-[#FECACA]';
      case 'REMINDER_SENT':
        return 'bg-[#FAF5FF] border-[#E9D5FF]';
      default:
        return 'bg-[#EFF6FF] border-[#BFDBFE]';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#171717]">Recent Activity</h3>
        <Link
          to="/audit"
          className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {list.slice(0, 4).map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectCase && onSelectCase(item.caseId)}
            className="p-2.5 rounded-lg border border-[#F2F4F7] hover:border-[#EAECF0] hover:bg-[#F9FAFB] transition-all cursor-pointer flex items-start gap-3 text-left"
          >
            <div className={`p-1.5 rounded-md border shrink-0 ${getBg(item.type)}`}>
              {getIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#171717] truncate">{item.title}</span>
                <span className="text-[10px] text-[#98A2B3] shrink-0">{item.timeAgo}</span>
              </div>
              <p className="text-[11px] text-[#667085] truncate mt-0.5">{item.description}</p>
              <div className="text-[10px] font-mono text-[#2563EB] mt-1 font-medium">
                #{item.caseId}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
