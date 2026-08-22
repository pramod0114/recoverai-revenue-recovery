import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Zap,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { RecoveryCaseDetailModal } from '../components/common/RecoveryCaseDetailModal';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments({
        status: statusFilter,
        search,
        page,
        limit: 15
      });
      if (res.data) setPayments(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalRecords(res.pagination.total);
      }
    } catch (err: any) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleInstantRetry = async (paymentId: string) => {
    try {
      const res = await api.retryPayment(paymentId);
      setToastMessage(res.data?.message || 'Payment retry initiated via Razorpay.');
      await fetchPayments();
    } catch (err: any) {
      setToastMessage(`Retry error: ${err.message}`);
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
            Failed Payments Stream
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Real-time feed of {totalRecords.toLocaleString()} transactions across UPI, Card, Netbanking & Mandates.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#EAECF0] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by txn id, customer, reason..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <Filter className="w-3.5 h-3.5 text-[#98A2B3]" />
            <span className="font-medium">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-2.5 py-1 text-xs text-[#344054] font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="FAILED">Failed</option>
              <option value="RECOVERED">Recovered</option>
              <option value="SUCCESSFUL">Successful</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-[#EAECF0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Gateway Failure Code</th>
                <th className="py-3 px-4">Recovery Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#171717]">
                      {p.id}
                      <div className="text-[10px] text-[#98A2B3]">
                        {p.created_at ? new Date(p.created_at).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#171717]">
                        {p.customer_name || 'Verified Customer'}
                      </div>
                      <div className="text-[11px] text-[#98A2B3]">{p.customer_email || 'customer@pay.io'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#171717]">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F2F4F7] text-[#344054]">
                        {p.payment_method || 'UPI_MANDATE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#DC2626] font-mono text-[11px]">
                        {p.failure_reason || 'INSUFFICIENT_FUNDS'}
                      </div>
                      <div className="text-[10px] text-[#667085]">
                        {p.failure_category ? p.failure_category.replace(/_/g, ' ') : 'Gateway Technical'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.recovery_status === 'RECOVERED'
                            ? 'bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0]'
                            : p.recovery_status === 'RECOVERING'
                            ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                            : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                        }`}
                      >
                        {p.recovery_status || 'AT_RISK'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.recovery_status === 'RECOVERED' ? (
                        <span className="text-[11px] font-semibold text-[#16A34A] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Won Back
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInstantRetry(p.id)}
                          className="px-3 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    No payments found matching criteria.
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
            <span className="font-semibold text-[#171717]">{totalPages}</span> ({totalRecords} records)
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
          onUpdated={fetchPayments}
        />
      )}
    </div>
  );
};
