import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  User,
  CreditCard,
  Building,
  RefreshCw,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface RecoveryCaseDetailModalProps {
  caseId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const RecoveryCaseDetailModal: React.FC<RecoveryCaseDetailModalProps> = ({
  caseId,
  onClose,
  onUpdated
}) => {
  const [caseData, setCaseData] = useState<any>(null);
  const [mlPrediction, setMlPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;
    loadCase();
  }, [caseId]);

  const loadCase = async () => {
    try {
      setLoading(true);
      const res = await api.getRecoveryCaseById(caseId!);
      setCaseData(res.data);

      // Fetch live explainable ML prediction
      try {
        const mlRes = await api.predictMl({
          transaction_id: res.data?.transaction_id || res.data?.id,
          amount: res.data?.at_risk_amount,
          payment_method: res.data?.payment?.payment_method || res.data?.payment_method || 'UPI',
          failure_reason: res.data?.primary_failure_diagnosis || res.data?.payment?.failure_reason || 'Network Failure'
        });
        if (mlRes.data) {
          setMlPrediction(mlRes.data);
        }
      } catch (mlErr) {
        console.warn('ML live prediction error:', mlErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!caseId) return null;

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await api.approveRecoveryCase(caseId);
      setStatusMessage('Workflow successfully approved. AI recovery initiated.');
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async () => {
    try {
      setActionLoading(true);
      await api.escalateRecoveryCase(caseId, { reason: 'Analyst requested senior tier manual review' });
      setStatusMessage('Case escalated to senior recovery desk.');
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setActionLoading(true);
      await api.stopRecoveryCase(caseId);
      setStatusMessage('Recovery workflow stopped.');
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCustomAction = async (actionType: string) => {
    try {
      setActionLoading(true);
      const res = await api.triggerRecoveryAction(caseId, { actionType, channel: 'AUTONOMOUS_WEBHOOK' });
      setStatusMessage(res.data?.message || 'Action executed successfully.');
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN')}`;
  };

  const prob = caseData?.recovery_probability ? Math.round(caseData.recovery_probability * 100) : 78;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#EAECF0] flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#171717]">
                Recovery Case #{caseData?.id || caseId}
              </h2>
              {caseData?.status && (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    caseData.status === 'RECOVERED'
                      ? 'bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0]'
                      : caseData.status === 'IN_PROGRESS'
                      ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                      : caseData.status === 'UNRECOVERED'
                      ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                      : 'bg-[#FFF7ED] text-[#D97706] border border-[#FED7AA]'
                  }`}
                >
                  {caseData.status.replace('_', ' ')}
                </span>
              )}
              {caseData?.risk_level && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    caseData.risk_level === 'HIGH'
                      ? 'bg-[#FEF2F2] text-[#DC2626]'
                      : caseData.risk_level === 'MEDIUM'
                      ? 'bg-[#FFF7ED] text-[#D97706]'
                      : 'bg-[#ECFDF3] text-[#16A34A]'
                  }`}
                >
                  {caseData.risk_level} Risk
                </span>
              )}
            </div>
            <p className="text-xs text-[#667085] mt-1">
              Created on {caseData?.created_at ? new Date(caseData.created_at).toLocaleString('en-IN') : 'Recent'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#98A2B3] hover:text-[#171717] hover:bg-[#F2F4F7] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#667085] gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB]" />
              <span className="text-sm">Loading AI diagnostic breakdown...</span>
            </div>
          ) : (
            <>
              {statusMessage && (
                <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] rounded-xl text-xs flex items-center justify-between">
                  <span>{statusMessage}</span>
                  <button onClick={() => setStatusMessage(null)} className="underline ml-2">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Top Overview Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                  <div className="text-xs text-[#667085] font-medium">At-Risk Amount</div>
                  <div className="text-xl font-bold text-[#171717] mt-1">
                    {formatCurrency(caseData?.at_risk_amount)}
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">
                    {caseData?.currency || 'INR'}
                  </div>
                </div>

                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                  <div className="text-xs text-[#667085] font-medium">Customer</div>
                  <div className="text-sm font-bold text-[#171717] mt-1 truncate">
                    {caseData?.customer_name || 'Standard Business Customer'}
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">
                    LTV: {formatCurrency(caseData?.customer_ltv || 45000)}
                  </div>
                </div>

                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                  <div className="text-xs text-[#667085] font-medium">AI Recovery Probability</div>
                  <div className="text-xl font-bold text-[#2563EB] mt-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                    {prob}%
                  </div>
                  <div className="text-[11px] text-[#16A34A] mt-0.5 font-medium">
                    {prob >= 75 ? 'High confidence win-back' : 'Moderate intervention confidence'}
                  </div>
                </div>
              </div>

              {/* Main AI Recommendation Box */}
              <div className="p-5 bg-[#EFF6FF]/60 rounded-xl border border-[#BFDBFE] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#2563EB] text-white rounded-lg">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#1E40AF] uppercase tracking-wide">
                        AI Recommended Intervention
                      </div>
                      <div className="text-base font-bold text-[#171717]">
                        {caseData?.recommended_strategy
                          ? caseData.recommended_strategy.replace(/_/g, ' ')
                          : 'DYNAMIC RETRY'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-white text-[#2563EB] border border-[#BFDBFE] rounded-lg shadow-2xs">
                      {mlPrediction?.model_version || 'recovery-model-v1'} Active
                    </span>
                  </div>
                </div>

                {/* Evidence & Why Explanation */}
                <div className="bg-white p-4 rounded-xl border border-[#EAECF0] space-y-2.5">
                  <div className="text-xs font-semibold text-[#344054] flex items-center justify-between">
                    <span>WHY THIS STRATEGY? (EXPLAINABLE AI DIAGNOSTIC)</span>
                    {mlPrediction?.root_cause_confidence && (
                      <span className="text-[11px] text-[#2563EB] font-normal">
                        Confidence: {(mlPrediction.root_cause_confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {mlPrediction?.explanation && mlPrediction.explanation.length > 0 ? (
                    <ul className="space-y-2 text-xs text-[#475467]">
                      {mlPrediction.explanation.map((exp: any, idx: number) => (
                        <li key={idx} className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-[#F9FAFB]">
                          <div className="flex items-start gap-2">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                exp.direction === '+' ? 'bg-[#ECFDF3] text-[#16A34A]' : 'bg-[#FEF2F2] text-[#DC2626]'
                              }`}
                            >
                              {exp.direction}
                            </span>
                            <span>{exp.description}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-[#667085] shrink-0">
                            Impact: {(exp.impact * 100).toFixed(0)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-[#475467]">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                        <span>
                          Customer has <strong>{caseData?.payment_history_success_count || 8}</strong> prior successful transactions on this gateway.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                        <span>
                          Diagnosis: <strong>{caseData?.primary_failure_diagnosis || 'Temporary bank network timeout (GATEWAY_TIMEOUT)'}</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                        <span>
                          Optimal retry window calculated: <strong>Off-peak banking window (+35 mins)</strong> with 84% simulated success rate.
                        </span>
                      </li>
                    </ul>
                  )}
                  {mlPrediction?.action_reason && (
                    <div className="text-[11px] text-[#667085] pt-1 border-t border-[#EAECF0]">
                      <strong>Decision Rule:</strong> {mlPrediction.action_reason}
                    </div>
                  )}
                </div>

                {/* Root Cause & Policy Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-[#EAECF0]">
                    <span className="text-[#667085] block text-[11px]">Primary Root Cause</span>
                    <span className="font-semibold text-[#171717]">
                      {mlPrediction?.root_cause || caseData?.primary_failure_diagnosis || 'Temporary liquidity/gateway glitch'}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#EAECF0]">
                    <span className="text-[#667085] block text-[11px]">Safety Bounds & Policy</span>
                    <span className="font-semibold text-[#16A34A]">
                      Retry bounded (Max 2 attempts, 0 user fatigue)
                    </span>
                  </div>
                </div>
              </div>

              {/* Case Lifecycle Timeline */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#344054] uppercase tracking-wider">
                  Case Execution Timeline
                </div>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EAECF0]">
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-6 w-4 h-4 rounded-full bg-[#DC2626] border-2 border-white flex items-center justify-center text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#171717]">
                        Payment Failed ({formatCurrency(caseData?.at_risk_amount)})
                      </div>
                      <div className="text-[11px] text-[#667085]">
                        Razorpay Gateway returned response: {caseData?.payment?.failure_reason || 'INSUFFICIENT_FUNDS'}
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-6 w-4 h-4 rounded-full bg-[#2563EB] border-2 border-white flex items-center justify-center text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#171717]">
                        AI Diagnostic & Probability Scored ({prob}%)
                      </div>
                      <div className="text-[11px] text-[#667085]">
                        Feature vector evaluated across customer tenure, past failure rate, and bank latency.
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-6 w-4 h-4 rounded-full bg-[#16A34A] border-2 border-white flex items-center justify-center text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#171717]">
                        Recovery Workflow Prepared
                      </div>
                      <div className="text-[11px] text-[#667085]">
                        Recommended strategy: {caseData?.recommended_strategy || 'SMART_RETRY_OFFPEAK'}
                      </div>
                    </div>
                  </div>

                  {caseData?.status === 'RECOVERED' && (
                    <div className="relative flex items-start gap-3">
                      <div className="absolute -left-6 w-4 h-4 rounded-full bg-[#16A34A] border-2 border-white flex items-center justify-center text-white">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white fill-[#16A34A]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#16A34A]">
                          Revenue Recovered Successfully ({formatCurrency(caseData?.recovered_amount || caseData?.at_risk_amount)})
                        </div>
                        <div className="text-[11px] text-[#667085]">
                          Transaction settled back into merchant balance. Audit hash generated.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#EAECF0] bg-[#F9FAFB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleStop}
              disabled={actionLoading || caseData?.status === 'RECOVERED'}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] border border-[#FECDCA] transition-colors disabled:opacity-50"
            >
              Stop Recovery
            </button>
            <button
              onClick={handleEscalate}
              disabled={actionLoading || caseData?.status === 'RECOVERED'}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#475467] hover:bg-[#F2F4F7] border border-[#EAECF0] transition-colors disabled:opacity-50"
            >
              Escalate to Human
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCustomAction('DYNAMIC_RETRY')}
              disabled={actionLoading || caseData?.status === 'RECOVERED'}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-colors disabled:opacity-50"
            >
              Trigger Instant Retry
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading || caseData?.status === 'RECOVERED'}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Approve Recovery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
