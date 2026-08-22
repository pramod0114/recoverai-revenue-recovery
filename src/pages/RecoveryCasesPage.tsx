import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RecoveryCaseDetailModal } from '../components/common/RecoveryCaseDetailModal';
import {
  Target,
  Search,
  Filter,
  RefreshCw,
  Zap,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield,
  Download
} from 'lucide-react';

export const RecoveryCasesPage: React.FC = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [strategyFilter, setStrategyFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.getRecoveryCases({
        status: statusFilter,
        strategy: strategyFilter,
        search,
        page,
        limit: 15
      });
      if (res.data) setCases(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalRecords(res.pagination.total);
      }
    } catch (err: any) {
      console.error('Failed to fetch recovery cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, statusFilter, strategyFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCases();
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-semibold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            Recovery Cases Pipeline
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Autonomous win-back tracking for {totalRecords.toLocaleString()} failed transactions with explainable AI logic.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCases}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#EAECF0] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case ID, customer, diagnosis..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </form>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <Filter className="w-3.5 h-3.5 text-[#98A2B3]" />
            <span className="font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-2.5 py-1 text-xs text-[#344054] font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RECOVERED">Recovered</option>
              <option value="UNRECOVERED">Unrecovered</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <span className="font-medium">Strategy:</span>
            <select
              value={strategyFilter}
              onChange={(e) => {
                setStrategyFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-2.5 py-1 text-xs text-[#344054] font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Strategies</option>
              <option value="SMART_RETRY_OFFPEAK">Smart Retry Off-Peak</option>
              <option value="DYNAMIC_RETRY">Dynamic Retry</option>
              <option value="DUNNING_WHATSAPP">Dunning WhatsApp</option>
              <option value="DUNNING_EMAIL">Dunning Email</option>
              <option value="PAYMENT_LINK_SMS">Payment Link SMS</option>
              <option value="METHOD_SWITCH_UPI">Method Switch UPI</option>
              <option value="MANUAL_INTERVENTION">Manual Intervention</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-[#EAECF0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">At-Risk Amount</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">AI Recommendation</th>
                <th className="py-3 px-4">Win Probability</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Investigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {cases.length > 0 ? (
                cases.map((c) => {
                  const prob = Math.round((c.recovery_probability || 0.75) * 100);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#2563EB]">
                        #{c.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#171717]">{c.customer_name || 'Standard Client'}</div>
                        <div className="text-[11px] text-[#98A2B3]">
                          LTV: {formatCurrency(c.customer_ltv || 35000)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#171717]">
                        {formatCurrency(c.at_risk_amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.risk_level === 'HIGH'
                              ? 'bg-[#FEF2F2] text-[#DC2626]'
                              : c.risk_level === 'MEDIUM'
                              ? 'bg-[#FFF7ED] text-[#D97706]'
                              : 'bg-[#ECFDF3] text-[#16A34A]'
                          }`}
                        >
                          {c.risk_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#344054] font-medium">
                          <Zap className="w-3 h-3 text-[#2563EB] shrink-0" />
                          <span>
                            {c.recommended_strategy
                              ? c.recommended_strategy.replace(/_/g, ' ')
                              : 'DYNAMIC RETRY'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#667085] truncate max-w-[180px]">
                          {c.primary_failure_diagnosis}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#F2F4F7] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                prob >= 75
                                  ? 'bg-[#16A34A]'
                                  : prob >= 50
                                  ? 'bg-[#2563EB]'
                                  : 'bg-[#D97706]'
                              }`}
                              style={{ width: `${prob}%` }}
                            />
                          </div>
                          <span className="font-semibold text-[#171717]">{prob}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.status === 'RECOVERED'
                              ? 'bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0]'
                              : c.status === 'IN_PROGRESS'
                              ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                              : c.status === 'UNRECOVERED'
                              ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              : 'bg-[#FFF7ED] text-[#D97706] border border-[#FED7AA]'
                          }`}
                        >
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseId(c.id);
                          }}
                          className="px-3 py-1 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] rounded-md text-xs font-semibold transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#667085]">
                    No recovery cases match the selected filter.
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
            <span className="font-semibold text-[#171717]">{totalPages}</span> ({totalRecords} cases)
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

      {/* Case Detail Modal */}
      {selectedCaseId && (
        <RecoveryCaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onUpdated={fetchCases}
        />
      )}
    </div>
  );
};
