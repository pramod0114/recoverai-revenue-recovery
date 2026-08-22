import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import {
  Search,
  Target,
  CreditCard,
  Users,
  X,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GlobalSearchDropdownProps {
  onSelectCase?: (caseId: string) => void;
  onSelectCustomer?: (customer: any) => void;
  onSelectPayment?: (paymentId: string) => void;
}

export const GlobalSearchDropdown: React.FC<GlobalSearchDropdownProps> = ({
  onSelectCase,
  onSelectCustomer,
  onSelectPayment
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ cases: any[]; payments: any[]; customers: any[] }>({
    cases: [],
    payments: [],
    customers: []
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ cases: [], payments: [], customers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.globalSearch(query);
        if (res.data) {
          setResults(res.data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results.cases.length > 0 || results.payments.length > 0 || results.customers.length > 0;

  return (
    <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md" ref={containerRef}>
      <div className="relative">
        <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Case ID, Transaction ID, Customer..."
          className="w-full pl-9 pr-8 py-1.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#171717]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#EAECF0] rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto p-2 space-y-3 animate-in fade-in slide-in-from-top-1">
          {loading && (
            <div className="py-4 text-center text-xs text-[#667085]">Searching records...</div>
          )}

          {!loading && !hasResults && (
            <div className="py-6 text-center text-xs text-[#667085]">
              No matches found for "{query}".
            </div>
          )}

          {/* Recovery Cases */}
          {!loading && results.cases.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider px-2 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-[#2563EB]" />
                Recovery Cases ({results.cases.length})
              </div>
              {results.cases.map((c) => (
                <button
                  key={c.id || c.case_id}
                  onClick={() => {
                    setIsOpen(false);
                    if (onSelectCase) {
                      onSelectCase(c.id || c.case_id);
                    } else {
                      navigate(`/recovery?search=${c.id || c.case_id}`);
                    }
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-[#F9FAFB] flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <div className="font-semibold text-[#171717] flex items-center gap-2">
                      <span>#{c.id || c.case_id}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          c.status === 'RECOVERED'
                            ? 'bg-[#ECFDF3] text-[#16A34A]'
                            : 'bg-[#FFF7ED] text-[#D97706]'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#667085]">
                      {c.customer_name || 'Customer'} • ₹{(c.at_risk_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#98A2B3]" />
                </button>
              ))}
            </div>
          )}

          {/* Failed Payments */}
          {!loading && results.payments.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[#EAECF0]">
              <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider px-2 flex items-center gap-1.5">
                <CreditCard className="w-3 h-3 text-[#DC2626]" />
                Payments ({results.payments.length})
              </div>
              {results.payments.map((p) => (
                <button
                  key={p.id || p.transaction_id}
                  onClick={() => {
                    setIsOpen(false);
                    if (onSelectPayment) {
                      onSelectPayment(p.transaction_id || p.id);
                    } else {
                      navigate(`/payments?search=${p.transaction_id || p.id}`);
                    }
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-[#F9FAFB] flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <div className="font-semibold text-[#171717] font-mono">
                      {p.transaction_id || p.id}
                    </div>
                    <div className="text-[11px] text-[#667085]">
                      ₹{Number(p.amount || 0).toLocaleString('en-IN')} • {p.failure_reason || p.payment_method}
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#98A2B3]" />
                </button>
              ))}
            </div>
          )}

          {/* Customers */}
          {!loading && results.customers.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[#EAECF0]">
              <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider px-2 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-[#16A34A]" />
                Customers ({results.customers.length})
              </div>
              {results.customers.map((cust) => (
                <button
                  key={cust.id}
                  onClick={() => {
                    setIsOpen(false);
                    if (onSelectCustomer) {
                      onSelectCustomer(cust);
                    } else {
                      navigate(`/customers?search=${cust.name || cust.email}`);
                    }
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-[#F9FAFB] flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <div className="font-semibold text-[#171717]">{cust.name}</div>
                    <div className="text-[11px] text-[#667085]">{cust.email}</div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#98A2B3]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
