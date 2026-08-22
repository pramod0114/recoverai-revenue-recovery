import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Zap,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Smartphone,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RecoveryCaseDetailModal } from '../components/common/RecoveryCaseDetailModal';

export const InterventionsPage: React.FC = () => {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const fetchInterventions = async () => {
    try {
      setLoading(true);
      const res = await api.getInterventions({
        status: statusFilter,
        page,
        limit: 15
      });
      if (res.data) setInterventions(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalRecords(res.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [page, statusFilter]);

  const getChannelBadge = (channel: string) => {
    switch (channel?.toUpperCase()) {
      case 'WHATSAPP':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF3] text-[#16A34A] flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> WhatsApp
          </span>
        );
      case 'SMS':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FAF5FF] text-[#9333EA] flex items-center gap-1">
            <Smartphone className="w-3 h-3" /> SMS
          </span>
        );
      case 'HUMAN_SUPPORT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Human Desk
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF6FF] text-[#2563EB] flex items-center gap-1">
            <Zap className="w-3 h-3" /> Gateway Auto
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            Recovery Interventions Stream
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Live telemetry of {totalRecords.toLocaleString()} autonomous recovery actions, retries, and customer dunning dispatches.
          </p>
        </div>

        <button
          onClick={fetchInterventions}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#EAECF0] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#667085]">
          <Filter className="w-3.5 h-3.5 text-[#98A2B3]" />
          <span className="font-medium">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-2.5 py-1 text-xs text-[#344054] font-medium focus:outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">All Actions</option>
            <option value="SUCCESS">Success (Recovered)</option>
            <option value="EXECUTED">Executed</option>
            <option value="PENDING_REVIEW">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#EAECF0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Action ID</th>
                <th className="py-3 px-4">Case & Customer</th>
                <th className="py-3 px-4">Intervention Type</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Result / Telemetry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Execution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {interventions.length > 0 ? (
                interventions.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => item.case_id && setSelectedCaseId(item.case_id)}
                    className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#171717]">
                      {item.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[#2563EB] font-semibold">
                        #{item.case_id}
                      </div>
                      <div className="text-[11px] text-[#667085]">
                        {item.case?.customer_name || 'Standard Account'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#171717]">
                      {item.action_type ? item.action_type.replace(/_/g, ' ') : 'DYNAMIC RETRY'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getChannelBadge(item.trigger_channel)}
                    </td>
                    <td className="py-3.5 px-4 text-[#475467] max-w-[260px] truncate">
                      {item.result_response || 'Intervention executed successfully'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.status === 'SUCCESS'
                            ? 'bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0]'
                            : item.status === 'EXECUTED'
                            ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                            : 'bg-[#FFF7ED] text-[#D97706] border border-[#FED7AA]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-[11px] text-[#667085]">
                      {item.created_at ? new Date(item.created_at).toLocaleTimeString() : 'Recent'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    No interventions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#EAECF0] bg-[#F9FAFB] flex items-center justify-between text-xs text-[#667085]">
          <div>
            Showing page <span className="font-semibold text-[#171717]">{page}</span> of{' '}
            <span className="font-semibold text-[#171717]">{totalPages}</span> ({totalRecords} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#EAECF0] hover:bg-[#F2F4F7] disabled:opacity-50 text-[#344054] font-medium flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#EAECF0] hover:bg-[#F2F4F7] disabled:opacity-50 text-[#344054] font-medium flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {selectedCaseId && (
        <RecoveryCaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onUpdated={fetchInterventions}
        />
      )}
    </div>
  );
};
