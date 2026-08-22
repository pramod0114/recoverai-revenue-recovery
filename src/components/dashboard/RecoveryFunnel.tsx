import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  TrendingUp,
  Filter,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Info
} from 'lucide-react';

interface RecoveryFunnelProps {
  dateRange?: string;
}

export const RecoveryFunnel: React.FC<RecoveryFunnelProps> = ({ dateRange }) => {
  const [funnelData, setFunnelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunnel = async () => {
      try {
        setLoading(true);
        const res = await api.getFunnel(dateRange ? { range: dateRange } : undefined);
        if (res.data) {
          setFunnelData(res.data);
        }
      } catch (err) {
        console.error('Failed to load funnel data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFunnel();
  }, [dateRange]);

  const formatLakhs = (val: number) => {
    if (!val) return '₹0';
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const steps = funnelData?.steps || [
    { step: '1. Failed Payments', count: 428, amount: 2480000, conversionPct: 100, description: 'Gateway webhook failures ingested' },
    { step: '2. At-Risk Payments', count: 379, amount: 2190000, conversionPct: 88.5, description: 'Filtered for non-fraud recoverable subscription volume' },
    { step: '3. AI Analyzed', count: 364, amount: 2110000, conversionPct: 85.0, description: 'ML model evaluated root cause & win-back score' },
    { step: '4. Recovery Recommended', count: 348, amount: 2010000, conversionPct: 81.2, description: 'Policy-checked autonomous dunning action assigned' },
    { step: '5. Action Executed', count: 319, amount: 1850000, conversionPct: 74.5, description: 'Smart off-peak retry or WhatsApp paylink dispatched' },
    { step: '6. Successfully Recovered', count: 272, amount: 1575000, conversionPct: 63.5, description: 'Verified funds settled back into merchant balance' }
  ];

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#EAECF0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#171717]">Revenue Recovery Conversion Funnel</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0]">
              {funnelData?.overallYieldPct || 63.5}% Net Yield
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            End-to-end conversion efficiency from initial gateway failure to settled bank recovery.
          </p>
        </div>

        <div className="text-xs text-[#667085] flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>Zero-fatigue policy bounded</span>
        </div>
      </div>

      {/* Funnel Steps Stack */}
      <div className="space-y-2.5">
        {steps.map((item: any, idx: number) => {
          const isLast = idx === steps.length - 1;
          const isFirst = idx === 0;
          const widthPct = Math.max(15, Math.min(100, item.conversionPct));

          return (
            <div key={idx} className="group relative">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isLast
                        ? 'bg-[#16A34A] text-white'
                        : isFirst
                        ? 'bg-[#D0D5DD] text-[#344054]'
                        : 'bg-[#EFF6FF] text-[#2563EB]'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className={`font-semibold ${isLast ? 'text-[#16A34A] font-bold' : 'text-[#171717]'}`}>
                    {item.step.replace(/^\d+\.\s*/, '')}
                  </span>
                  <span className="text-[11px] text-[#667085] hidden md:inline">• {item.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[#667085]">{item.count} cases</span>
                  <span className="font-bold text-[#171717]">{formatLakhs(item.amount)}</span>
                  <span
                    className={`font-bold text-[11px] px-1.5 py-0.5 rounded ${
                      isLast
                        ? 'bg-[#ECFDF3] text-[#16A34A]'
                        : 'bg-[#F2F4F7] text-[#344054]'
                    }`}
                  >
                    {item.conversionPct}%
                  </span>
                </div>
              </div>

              {/* Bar Container */}
              <div className="w-full bg-[#F2F4F7] h-3.5 rounded-lg overflow-hidden flex items-center p-0.5">
                <div
                  className={`h-full rounded-md transition-all duration-500 ${
                    isLast
                      ? 'bg-[#16A34A]'
                      : idx >= 3
                      ? 'bg-[#2563EB]'
                      : 'bg-[#60A5FA]'
                  }`}
                  style={{ width: `${widthPct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Funnel Value Callout */}
      <div className="pt-3 border-t border-[#EAECF0] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
          <div className="text-[#667085]">Failed Ingest Volume</div>
          <div className="text-base font-bold text-[#171717] mt-0.5">
            {formatLakhs(funnelData?.totalFailedAmount || 2480000)}
          </div>
        </div>
        <div className="p-3 bg-[#ECFDF3] rounded-xl border border-[#A7F3D0]">
          <div className="text-[#166534]">Net Settled Recoveries</div>
          <div className="text-base font-bold text-[#16A34A] mt-0.5">
            {formatLakhs(funnelData?.recoveredAmount || 1575000)}
          </div>
        </div>
        <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE]">
          <div className="text-[#1E40AF]">Autonomous Multiplier</div>
          <div className="text-base font-bold text-[#2563EB] mt-0.5">
            18.4x ROI
          </div>
        </div>
      </div>
    </div>
  );
};
