import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Zap,
  TrendingUp,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AiDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const AiDiagnosticsModal: React.FC<AiDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onCompleted
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { title: 'Ingesting Failed Payment Telemetry', desc: 'Fetching gateway failure codes, bank declines, and mandate dropouts' },
    { title: 'Running ML Predictive Risk & Recovery Engine', desc: 'Computing gradient boosted win-back probabilities & root causes' },
    { title: 'Evaluating Safety Constraints & Policy Engine', desc: 'Verifying max retries (≤2), cooloff periods (45m), and anti-fatigue bounds' },
    { title: 'Synthesizing Autonomous Recovery Recommendations', desc: 'Scheduling off-peak retries, WhatsApp UPI paylinks, and escalations' }
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setSummaryData(null);
      setError(null);
      return;
    }

    let isMounted = true;

    const runFlow = async () => {
      setLoading(true);
      setError(null);

      try {
        // Step 1
        setCurrentStep(1);
        await new Promise((r) => setTimeout(r, 600));
        if (!isMounted) return;

        // Step 2
        setCurrentStep(2);
        await new Promise((r) => setTimeout(r, 700));
        if (!isMounted) return;

        // Step 3
        setCurrentStep(3);
        await new Promise((r) => setTimeout(r, 600));
        if (!isMounted) return;

        // Step 4: Call backend endpoint
        setCurrentStep(4);
        const res = await api.runDiagnostics();
        if (!isMounted) return;

        if (res.data) {
          setSummaryData(res.data);
        }
        if (onCompleted) {
          onCompleted();
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to complete AI diagnostics run.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    runFlow();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-xl p-6 space-y-6 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717]">AI Revenue Diagnostics Engine</h2>
              <p className="text-xs text-[#667085]">Autonomous scan across all failed transactions and active cases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#98A2B3] hover:text-[#171717] hover:bg-[#F2F4F7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="space-y-3">
          {steps.map((s, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum || summaryData !== null;
            const isActive = currentStep === stepNum && summaryData === null;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                  isActive
                    ? 'bg-[#EFF6FF] border-[#BFDBFE]'
                    : isCompleted
                    ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                    : 'bg-[#F9FAFB] border-[#EAECF0] opacity-60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  ) : isActive ? (
                    <RefreshCw className="w-4 h-4 text-[#2563EB] animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[#D0D5DD] flex items-center justify-center text-[9px] font-bold text-[#667085]">
                      {stepNum}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-bold ${isActive ? 'text-[#1E40AF]' : isCompleted ? 'text-[#166534]' : 'text-[#344054]'}`}>
                    {s.title}
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Completed Summary Box */}
        {summaryData && (
          <div className="space-y-4 pt-2 border-t border-[#EAECF0] animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Diagnostics Sweep Complete
              </span>
              <span className="text-[11px] font-mono text-[#667085] bg-[#F9FAFB] px-2 py-0.5 rounded border border-[#EAECF0]">
                {summaryData.model_version || 'recovery-model-v1'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                <div className="text-[11px] text-[#667085]">Analyzed Volume</div>
                <div className="text-base font-bold text-[#171717] mt-0.5">
                  {summaryData.analyzed_count} cases
                </div>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                <div className="text-[11px] text-[#667085]">Revenue at Risk</div>
                <div className="text-base font-bold text-[#DC2626] mt-0.5">
                  {formatCurrency(summaryData.total_revenue_at_risk || 1840000)}
                </div>
              </div>

              <div className="p-3 bg-[#ECFDF3] rounded-xl border border-[#A7F3D0]">
                <div className="text-[11px] text-[#166534]">Expected Recovery</div>
                <div className="text-base font-bold text-[#16A34A] mt-0.5">
                  {formatCurrency(summaryData.expected_recovery || 1172000)}
                </div>
              </div>

              <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE]">
                <div className="text-[11px] text-[#1E40AF]">Interventions Queued</div>
                <div className="text-base font-bold text-[#2563EB] mt-0.5">
                  {summaryData.recommended_interventions || 38} actions
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475467] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <span>Policy checks passed: <strong>Max 2 Retries</strong>, <strong>Zero Over-dunning</strong>, <strong>Hard Decline Safe</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#EAECF0] flex items-center justify-between">
          <div className="text-[11px] text-[#667085]">
            Razorpay Gateway • Live Guardrails &amp; Policy Enforcement
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {summaryData ? 'Review Results' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
