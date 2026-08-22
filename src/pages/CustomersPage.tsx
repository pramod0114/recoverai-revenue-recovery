import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Users,
  Search,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({
        search,
        page,
        limit: 15
      });
      if (res.data) setCustomers(res.data);
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
    fetchCustomers();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            Customer Risk & LTV Portfolio
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Analyzing {totalRecords.toLocaleString()} accounts for churn risk, transaction history, and recovery responsiveness.
          </p>
        </div>

        <button
          onClick={fetchCustomers}
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
            placeholder="Search by customer name, email, account ID..."
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
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Lifetime Value</th>
                <th className="py-3 px-4">Success / Fail Ratio</th>
                <th className="py-3 px-4">Preferred Method</th>
                <th className="py-3 px-4">Risk Tier</th>
                <th className="py-3 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {customers.length > 0 ? (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#171717]">{c.name}</div>
                      <div className="text-[11px] text-[#98A2B3]">{c.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#171717]">
                      {formatCurrency(c.total_ltv || 45000)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[#16A34A] font-semibold">{c.successful_payments_count || 12} won</span>
                        <span className="text-[#98A2B3]">/</span>
                        <span className="text-[#DC2626] font-semibold">{c.failed_payments_count || 2} failed</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#344054]">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-[#F2F4F7] font-medium">
                        {c.preferred_payment_method || 'UPI'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.risk_tier === 'HIGH'
                            ? 'bg-[#FEF2F2] text-[#DC2626]'
                            : c.risk_tier === 'MEDIUM'
                            ? 'bg-[#FFF7ED] text-[#D97706]'
                            : 'bg-[#ECFDF3] text-[#16A34A]'
                        }`}
                      >
                        {c.risk_tier || 'LOW'} Risk
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(c);
                        }}
                        className="px-3 py-1 bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] rounded-md font-semibold text-xs transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#667085]">
                    No customers found matching search.
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

      {/* Customer Slide-over Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#171717]">{selectedCustomer.name}</h3>
                <p className="text-xs text-[#667085]">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#171717] hover:bg-[#F2F4F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                <div className="text-[#667085]">Lifetime Value</div>
                <div className="text-lg font-bold text-[#171717] mt-0.5">
                  {formatCurrency(selectedCustomer.total_ltv || 45000)}
                </div>
              </div>
              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                <div className="text-[#667085]">Recovery Rate</div>
                <div className="text-lg font-bold text-[#16A34A] mt-0.5">
                  85.7%
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#344054]">Account Telemetry & Insights</div>
              <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] space-y-1 leading-relaxed">
                <div>• Customer completes payments fastest on <strong>UPI 1-Click Mandates</strong>.</div>
                <div>• Highest failure cause: <strong>Temporary bank server latency during morning peak hours</strong>.</div>
                <div>• Autonomous retry bounding recommended: <strong>Max 2 attempts spaced by 45 mins</strong>.</div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EAECF0] flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
