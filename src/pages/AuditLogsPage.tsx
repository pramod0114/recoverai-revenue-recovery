import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bot,
  User,
  CheckCircle2,
  Code,
  X
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        search,
        page,
        limit: 15
      });
      if (res.data) setLogs(res.data);
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
    fetchLogs();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            Immutable Audit Trail & Compliance Log
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Complete cryptographic audit trail of all automated AI interventions, analyst overrides, and state mutations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-[#EAECF0] shadow-xs">
        <form onSubmit={handleSearch} className="relative max-w-md">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, case ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#EAECF0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Name</th>
                <th className="py-3 px-4">Entity Targeted</th>
                <th className="py-3 px-4">IP / Origin</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Payload Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {logs.length > 0 ? (
                logs.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedLog(l)}
                    className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#171717]">{l.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-[#171717]">
                        {l.actor_type === 'SYSTEM_AI_AGENT' ? (
                          <Bot className="w-3.5 h-3.5 text-[#2563EB]" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-[#16A34A]" />
                        )}
                        <span>{l.actor_type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-[10px] text-[#98A2B3] font-mono">{l.actor_id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#344054]">
                        {l.action_name.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#2563EB]">
                      {l.entity_type}: {l.entity_id}
                    </td>
                    <td className="py-3.5 px-4 text-[#667085] font-mono text-[11px]">
                      {l.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-4 text-[#667085]">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(l);
                        }}
                        className="px-2.5 py-1 bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#344054] rounded-md font-semibold text-xs transition-colors flex items-center gap-1 ml-auto"
                      >
                        <Code className="w-3 h-3" /> Diff
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#EAECF0] bg-[#F9FAFB] flex items-center justify-between text-xs text-[#667085]">
          <div>
            Showing page <span className="font-semibold text-[#171717]">{page}</span> of{' '}
            <span className="font-semibold text-[#171717]">{totalPages}</span> ({totalRecords} total entries)
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

      {/* JSON Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#171717]">Audit Mutation Payload</h3>
                <p className="text-xs text-[#667085]">{selectedLog.id} • {selectedLog.action_name}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-[#98A2B3] hover:text-[#171717] hover:bg-[#F2F4F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="font-semibold text-[#344054] mb-1">State Mutation Delta (JSON)</div>
                <pre className="p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl font-mono text-[11px] text-[#171717] overflow-x-auto max-h-60">
                  {JSON.stringify(
                    {
                      actor: selectedLog.actor_id,
                      actor_type: selectedLog.actor_type,
                      entity: `${selectedLog.entity_type} (#${selectedLog.entity_id})`,
                      previous_state: selectedLog.previous_state,
                      new_state: selectedLog.new_state,
                      ip_address: selectedLog.ip_address,
                      timestamp: selectedLog.created_at
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EAECF0] flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
