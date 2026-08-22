import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { RecoveryCaseDetailModal } from '../components/common/RecoveryCaseDetailModal';
import { ActionConfirmModal } from '../components/common/ActionConfirmModal';
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
  Download,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Flame,
  ArrowUpRight
} from 'lucide-react';

export const RecoveryCasesPage: React.FC = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [workflowFilter, setWorkflowFilter] = useState('ALL');
  const [strategyFilter, setStrategyFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'amount' | 'risk' | 'probability' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [actionConfirmCase, setActionConfirmCase] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.getRecoveryCases({
        status: statusFilter,
        workflow_state: workflowFilter,
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
  }, [page, statusFilter, workflowFilter, strategyFilter]);

  // Handle client-side sorting and risk filtering if needed
  const processedCases = useMemo(() => {
    let list = [...cases];

    if (riskFilter !== 'ALL') {
      list = list.filter((c) => c.risk_level === riskFilter);
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'amount') {
        comparison = (a.at_risk_amount || 0) - (b.at_risk_amount || 0);
      } else if (sortBy === 'risk') {
        const riskRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        comparison = (riskRank[a.risk_level] || 1) - (riskRank[b.risk_level] || 1);
      } else if (sortBy === 'probability') {
        comparison = (a.recovery_probability || 0) - (b.recovery_probability || 0);
      } else {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return list;
  }, [cases, riskFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCases();
  };

  const handleExecuteAction = async () => {
    if (!actionConfirmCase) return;
    try {
      const res = await api.executeRecovery({
        case_id: actionConfirmCase.id,
        override_action: actionConfirmCase.recommended_action || 'RETRY_PAYMENT'
      });
      setToastMessage(res.message || `Action executed successfully for Case #${actionConfirmCase.id}`);
      await fetchCases();
    } catch (err: any) {
      setToastMessage(`Action execution failed: ${err.message}`);
    } finally {
      setActionConfirmCase(null);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const exportCSV = () => {
    const headers = ['Case ID', 'Customer', 'Amount', 'Risk Level', 'Recovery Probability', 'Strategy', 'Workflow State', 'Created At'];
    const rows = processedCases.map((c) => [
      c.id,
      c.customer_name || 'Customer',
      c.at_risk_amount || 0,
      c.risk_level,
      c.recovery_probability || 0,
      c.recommended_strategy || 'RETRY',
      c.workflow_state || c.status,
      c.created_at
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recovery_cases_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (column: 'amount' | 'risk' | 'probability' | 'date') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center justify-between shadow-xs animate-in fade-in">
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
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
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
      <div className="bg-white p-4 rounded-xl border border-[#EAECF0] shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search case, customer, txn ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </form>

        {/* Multi-Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#667085]">
            <span className="font-medium">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-2.5 py-1 text-xs text-[#344054] font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Risk</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Workflow State */}
          <div className="flex items-center gap-1.5 text-xs text-[#667085]">
            <span className="font-medium">Workflow:</span>
            <select
              value={workflowFilter}
              onChange={(e) => {
                setWorkflowFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-2.5 py-1 text-xs text-[#344054] font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All States</option>
              <option value="DETECTED">DETECTED</option>
              <option value="ANALYZING">ANALYZING</option>
              <option value="RECOMMENDED">RECOMMENDED</option>
              <option value="POLICY_CHECK">POLICY CHECK</option>
              <option value="APPROVED">APPROVED</option>
              <option value="EXECUTING">EXECUTING</option>
              <option value="VERIFYING">VERIFYING</option>
              <option value="RECOVERED">RECOVERED</option>
              <option value="ESCALATED">ESCALATED</option>
            </select>
          </div>

          {/* Strategy */}
          <div className="flex items-center gap-1.5 text-xs text-[#667085]">
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
              <option value="MANUAL_INTERVENTION">Manual Escalation</option>
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
                <th
                  className="py-3 px-4 cursor-pointer hover:text-[#171717] select-none"
                  onClick={() => toggleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    <span>At-Risk</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 cursor-pointer hover:text-[#171717] select-none"
                  onClick={() => toggleSort('risk')}
                >
                  <div className="flex items-center gap-1">
                    <span>Risk Level</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 cursor-pointer hover:text-[#171717] select-none"
                  onClick={() => toggleSort('probability')}
                >
                  <div className="flex items-center gap-1">
                    <span>Win Prob</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">AI Recommendation</th>
                <th className="py-3 px-4">Workflow State</th>
                <th className="py-3 px-4">Action Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {processedCases.length > 0 ? (
                processedCases.map((c) => {
                  const prob = Math.round((c.recovery_probability || 0.75) * 100);
                  const workflowState = c.workflow_state || (c.status === 'RECOVERED' ? 'RECOVERED' : c.status === 'IN_PROGRESS' ? 'EXECUTING' : 'RECOMMENDED');
                  const isBlocked = c.actions_taken_count >= 2 && workflowState !== 'RECOVERED';

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
                        <div className="font-semibold text-[#171717]">{c.customer_name || 'Customer'}</div>
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
                            c.risk_level === 'CRITICAL' || c.risk_level === 'HIGH'
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
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-[#F2F4F7] rounded-full h-1.5 overflow-hidden">
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
                          <span className="font-semibold text-[#171717] text-[11px]">{prob}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#344054] font-medium text-xs">
                          <Zap className="w-3 h-3 text-[#2563EB] shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {c.recommended_strategy
                              ? c.recommended_strategy.replace(/_/g, ' ')
                              : 'Dynamic Retry'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#667085] truncate max-w-[140px]">
                          {c.primary_failure_diagnosis}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                            workflowState === 'RECOVERED'
                              ? 'bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0]'
                              : workflowState === 'EXECUTING' || workflowState === 'VERIFYING'
                              ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                              : workflowState === 'APPROVED'
                              ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                              : workflowState === 'BLOCKED' || workflowState === 'FAILED'
                              ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              : workflowState === 'ESCALATED'
                              ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                              : 'bg-[#F8FAFC] text-[#475467] border border-[#E2E8F0]'
                          }`}
                        >
                          {workflowState}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-[#171717] font-medium truncate max-w-[130px]">
                          {c.executed_action ? c.executed_action.replace(/_/g, ' ') : c.actions_taken_count > 0 ? `${c.actions_taken_count}/2 Retries` : 'Ready'}
                        </div>
                        <div className="text-[10px] text-[#667085] truncate max-w-[130px]">
                          {c.result || (c.status === 'RECOVERED' ? 'Settled in Razorpay' : 'Pending')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {workflowState !== 'RECOVERED' && (
                            <button
                              onClick={() => setActionConfirmCase(c)}
                              disabled={isBlocked}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:hover:bg-[#2563EB] rounded-md transition-colors flex items-center gap-1"
                              title={isBlocked ? 'Blocked by policy (Max retries reached)' : 'Execute Recovery Action'}
                            >
                              <Zap className="w-3 h-3" />
                              <span>Execute</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedCaseId(c.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#667085]">
                    No recovery cases match the selected filters.
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

      {/* Action Confirmation Modal */}
      {actionConfirmCase && (
        <ActionConfirmModal
          isOpen={true}
          onClose={() => setActionConfirmCase(null)}
          onConfirm={handleExecuteAction}
          actionTitle={`Execute ${actionConfirmCase.recommended_strategy?.replace(/_/g, ' ') || 'Recovery Action'}`}
          actionType={actionConfirmCase.recommended_action || 'RETRY_PAYMENT'}
          caseId={actionConfirmCase.id}
          customerName={actionConfirmCase.customer_name}
          amount={actionConfirmCase.at_risk_amount}
          recoveryProbability={actionConfirmCase.recovery_probability}
          currentRetryCount={actionConfirmCase.actions_taken_count || 0}
          maxRetryLimit={2}
          reason={actionConfirmCase.reasoning || actionConfirmCase.primary_failure_diagnosis}
          isPolicyAllowed={(actionConfirmCase.actions_taken_count || 0) < 2}
          policyBlockedReason={
            (actionConfirmCase.actions_taken_count || 0) >= 2
              ? 'Max retries (2) limit reached. Bounded policy prevents customer payment fatigue.'
              : undefined
          }
        />
      )}

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
