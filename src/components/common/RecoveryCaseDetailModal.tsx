import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ActionConfirmModal } from './ActionConfirmModal';
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
  HelpCircle,
  FileText,
  Activity,
  Send,
  Lock,
  RotateCw,
  Workflow,
  MessageSquare,
  Mail,
  ExternalLink,
  Ban,
  PhoneCall,
  Flame,
  Check
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
  const [agentDecision, setAgentDecision] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'audit'>('overview');
  const [confirmAction, setConfirmAction] = useState<{
    actionType: string;
    title: string;
    reason: string;
  } | null>(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalateInput, setShowEscalateInput] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    loadCase();
  }, [caseId]);

  const loadCase = async () => {
    try {
      setLoading(true);
      const res = await api.getRecoveryCaseById(caseId!);
      setCaseData(res.data);

      // Load agent audit trail
      try {
        const auditRes = await api.getRecoveryCaseAudit(caseId!);
        if (auditRes.data?.audit_trail) {
          setAuditLogs(auditRes.data.audit_trail);
        }
      } catch (aErr) {
        console.warn('Audit trail load error:', aErr);
      }

      // Pre-evaluate agent analysis if not already cached
      try {
        const analyzeRes = await api.analyzeRecovery({
          case_id: res.data?.id,
          transaction_id: res.data?.transaction_id || res.data?.id,
          amount: res.data?.at_risk_amount,
          payment_method: res.data?.payment?.payment_method || res.data?.payment_method || 'UPI',
          failure_reason: res.data?.primary_failure_diagnosis || 'Network Failure',
          retry_count: res.data?.actions_taken_count || 0
        });
        if (analyzeRes.data) {
          setAgentDecision(analyzeRes.data);
        }
      } catch (dErr) {
        console.warn('Agent decision load error:', dErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!caseId) return null;

  const handleRunDiagnostics = async () => {
    try {
      setActionLoading(true);
      const res = await api.analyzeRecovery({
        case_id: caseData?.id,
        transaction_id: caseData?.transaction_id,
        amount: caseData?.at_risk_amount,
        payment_method: caseData?.payment_method || 'UPI',
        failure_reason: caseData?.primary_failure_diagnosis || 'Network Failure',
        retry_count: caseData?.actions_taken_count || 0
      });
      setAgentDecision(res.data);
      setStatusMessage(`AI Diagnostics completed. Policy engine: ${res.data?.policy_result?.passed ? 'APPROVED' : 'BLOCKED'}`);
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Diagnostics error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteBoundedAction = async (overrideAction?: string) => {
    try {
      setActionLoading(true);
      const actionToRun = overrideAction || confirmAction?.actionType || agentDecision?.recommended_action || caseData?.recommended_strategy || 'RETRY_PAYMENT';
      const res = await api.executeRecovery({
        case_id: caseData?.id,
        transaction_id: caseData?.transaction_id,
        override_action: actionToRun
      });
      const exec = res.data?.execution;
      const ver = res.data?.verification;
      if (ver?.is_recovered) {
        setStatusMessage(`Money verified and recovered: ₹${ver.verified_amount.toLocaleString('en-IN')} settled in Razorpay Test Gateway!`);
      } else {
        setStatusMessage(`Action executed: ${exec?.action}. Verification: ${ver?.details || exec?.status}`);
      }
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Execution error: ${err.message}`);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleVerifyStatus = async () => {
    try {
      setActionLoading(true);
      const res = await api.verifyRecovery({ case_id: caseData?.id });
      setStatusMessage(`Verification result: ${res.data?.details}`);
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Verification error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalateSubmit = async () => {
    try {
      setActionLoading(true);
      await api.escalateRecovery({
        case_id: caseData?.id,
        reason: escalateReason || 'Manual specialist review requested from operator console.'
      });
      setStatusMessage('Case escalated to senior recovery operations desk.');
      setShowEscalateInput(false);
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Escalation error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminOverride = async (overrideReason: string) => {
    try {
      setActionLoading(true);
      const actionToRun = confirmAction?.actionType || agentDecision?.recommended_action || caseData?.recommended_strategy || 'RETRY_PAYMENT';
      const res = await api.overridePolicy({
        case_id: caseData?.id,
        reason: overrideReason,
        override_action: actionToRun
      });
      setStatusMessage(`Admin Policy Override Executed: ${res.data?.details || 'Action completed successfully.'}`);
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Override error: ${err.message}`);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;
  const prob = Math.round(((agentDecision?.recovery_probability ?? caseData?.recovery_probability) || 0.75) * 100);
  const workflowState = caseData?.workflow_state || (caseData?.status === 'RECOVERED' ? 'RECOVERED' : 'RECOMMENDED');
  const retryCount = caseData?.actions_taken_count || 0;
  const isExceededRetry = retryCount >= 2;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#EAECF0] flex items-center justify-between bg-[#F9FAFB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-[#2563EB]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[#171717]">
                  Recovery Case #{caseData?.id || caseId}
                </h2>
                <span className="px-2 py-0.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#027A48] text-[10px] font-bold rounded-full">
                  RAZORPAY PROTECTED
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
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
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  caseData?.risk_level === 'CRITICAL' || caseData?.risk_level === 'HIGH'
                    ? 'bg-[#FEF2F2] text-[#DC2626]'
                    : caseData?.risk_level === 'MEDIUM'
                    ? 'bg-[#FFF7ED] text-[#D97706]'
                    : 'bg-[#ECFDF3] text-[#16A34A]'
                }`}>
                  {caseData?.risk_level || 'HIGH'} RISK
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                Customer: <span className="font-semibold text-[#171717]">{caseData?.customer_name || 'Client'}</span> · At-Risk: <span className="font-semibold text-[#171717]">{formatCurrency(caseData?.at_risk_amount)}</span> · Created {caseData ? new Date(caseData.created_at).toLocaleString() : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#EAECF0] rounded-lg text-[#667085] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 8-Step Bounded State Machine Progress Ribbon */}
        <div className="bg-white border-b border-[#EAECF0] px-6 py-2.5 flex items-center justify-between text-[11px] overflow-x-auto">
          {['DETECTED', 'ANALYZING', 'RECOMMENDED', 'POLICY_CHECK', 'APPROVED', 'EXECUTING', 'VERIFYING', 'RECOVERED'].map((step, idx) => {
            const isCurrent = workflowState === step;
            const isCompleted =
              workflowState === 'RECOVERED' ||
              (workflowState === 'EXECUTING' && idx <= 5) ||
              (workflowState === 'APPROVED' && idx <= 4) ||
              (workflowState === 'RECOMMENDED' && idx <= 2);

            return (
              <div key={step} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-[#2563EB] text-white ring-2 ring-[#93C5FD]'
                      : isCompleted
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-[#F2F4F7] text-[#98A2B3]'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className={`font-medium ${isCurrent ? 'text-[#2563EB] font-bold' : isCompleted ? 'text-[#16A34A]' : 'text-[#98A2B3]'}`}>
                  {step.replace('_', ' ')}
                </span>
                {idx < 7 && <div className="w-4 h-[1px] bg-[#EAECF0] mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#EAECF0] px-6 bg-[#FAFAFA] text-xs font-semibold text-[#667085] overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'border-[#2563EB] text-[#2563EB] bg-white'
                : 'border-transparent hover:text-[#171717]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Decision & Investigation
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'actions'
                ? 'border-[#2563EB] text-[#2563EB] bg-white'
                : 'border-transparent hover:text-[#171717]'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            Policy-Aware Action Panel
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'audit'
                ? 'border-[#2563EB] text-[#2563EB] bg-white'
                : 'border-transparent hover:text-[#171717]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Audit Trail & Compliance ({auditLogs.length})
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="mx-6 mt-4 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="font-semibold underline ml-3 shrink-0">
              Dismiss
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center text-[#667085] flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB]" />
              <p className="text-xs">Loading case context and AI policy evaluation...</p>
            </div>
          ) : activeTab === 'overview' ? (
            <>
              {/* Top Overview Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#EAECF0]">
                  <div className="text-[11px] text-[#667085] uppercase tracking-wider font-semibold">Revenue At Risk</div>
                  <div className="text-xl font-bold text-[#171717] mt-1">
                    {formatCurrency(caseData?.at_risk_amount)}
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Method: {caseData?.payment_method || 'UPI'}</div>
                </div>

                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#EAECF0]">
                  <div className="text-[11px] text-[#667085] uppercase tracking-wider font-semibold">Recovery Prob</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold text-[#171717]">{prob}%</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prob >= 70 ? 'bg-[#ECFDF3] text-[#16A34A]' : 'bg-[#FFF7ED] text-[#D97706]'}`}>
                      {prob >= 70 ? 'HIGH' : 'MODERATE'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Confidence: {Math.round((agentDecision?.confidence || 0.88) * 100)}%</div>
                </div>

                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#EAECF0]">
                  <div className="text-[11px] text-[#667085] uppercase tracking-wider font-semibold">Retries Exhausted</div>
                  <div className="text-xl font-bold text-[#171717] mt-1">
                    {retryCount} / 2
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Policy Limit: 2</div>
                </div>

                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#EAECF0]">
                  <div className="text-[11px] text-[#667085] uppercase tracking-wider font-semibold">Policy Status</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {!isExceededRetry ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                    )}
                    <span className="text-sm font-bold text-[#171717]">
                      {!isExceededRetry ? 'PASSED & BOUNDED' : 'BLOCKED (MAX RETRIES)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Anti-fatigue protection active</div>
                </div>
              </div>

              {/* AI Decision Card */}
              <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#2563EB]" />
                    <h3 className="text-sm font-bold text-[#171717]">AI Decision & Investigation Card</h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#667085]">Model: {agentDecision?.model_version || 'recovery-model-v1'}</span>
                </div>

                <div className="p-4 bg-[#EFF6FF]/70 border border-[#BFDBFE] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1D4ED8] uppercase tracking-wider">
                      Primary AI Recommendation
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#2563EB] text-white rounded-full text-xs font-bold font-mono">
                      {agentDecision?.recommended_action || caseData?.recommended_strategy || 'RETRY_PAYMENT'}
                    </span>
                  </div>
                  <p className="text-xs text-[#1E3A8A] leading-relaxed">
                    {agentDecision?.reason || caseData?.reason || 'Agent analyzed the payment failure telemetry and predicted high win-back probability via off-peak test smart retry.'}
                  </p>
                </div>

                {/* Extracted Evidence Grid */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#344054] uppercase tracking-wider">Extracted Telemetry Evidence</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg">
                      <span className="text-[#667085] block text-[11px]">Payment Method</span>
                      <span className="font-semibold text-[#171717]">{caseData?.payment_method || 'UPI'}</span>
                    </div>
                    <div className="p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg">
                      <span className="text-[#667085] block text-[11px]">Failure Reason</span>
                      <span className="font-semibold text-[#DC2626] truncate block">{caseData?.primary_failure_diagnosis || 'Bank Network Timeout'}</span>
                    </div>
                    <div className="p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg">
                      <span className="text-[#667085] block text-[11px]">Customer LTV</span>
                      <span className="font-semibold text-[#171717]">₹{(caseData?.customer_ltv || 45000).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg">
                      <span className="text-[#667085] block text-[11px]">Historical Success</span>
                      <span className="font-semibold text-[#16A34A]">92.4%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Profile & Gateway Record */}
              <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-[#171717]">Gateway & Customer Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[#667085]">Customer Name</span>
                    <div className="font-semibold text-[#171717] mt-0.5">{caseData?.customer_name || 'Enterprise Client'}</div>
                  </div>
                  <div>
                    <span className="text-[#667085]">Email Address</span>
                    <div className="font-semibold text-[#171717] mt-0.5">{caseData?.customer_email || 'client@example.com'}</div>
                  </div>
                  <div>
                    <span className="text-[#667085]">Transaction ID</span>
                    <div className="font-mono text-[#2563EB] mt-0.5">txn_{caseData?.id || '89201'}</div>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'actions' ? (
            /* Policy-Aware Action Panel */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#171717]">Policy-Aware Action Control Center</h3>
                  <p className="text-xs text-[#667085]">
                    Execute bounded recovery interventions or manually route the transaction.
                  </p>
                </div>
                {isExceededRetry && (
                  <span className="px-3 py-1 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-lg text-xs font-semibold flex items-center gap-1">
                    <Ban className="w-3.5 h-3.5" /> Blocked by Policy: Max Retries (2) Exceeded
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Smart Retry */}
                <div className={`p-4 rounded-xl border transition-all ${
                  !isExceededRetry && workflowState !== 'RECOVERED'
                    ? 'bg-white border-[#EAECF0] hover:border-[#2563EB] shadow-xs'
                    : 'bg-[#F9FAFB] border-[#EAECF0] opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#EFF6FF] text-[#2563EB] rounded-lg">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171717]">Smart Off-Peak Retry</h4>
                        <span className="text-[10px] text-[#16A34A] font-semibold">91% Win Probability</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmAction({
                        actionType: 'RETRY_PAYMENT',
                        title: 'Execute Smart Off-Peak Retry',
                        reason: 'Schedule dynamic off-peak retry during low bank server congestion.'
                      })}
                      disabled={isExceededRetry || workflowState === 'RECOVERED' || actionLoading}
                      className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#94A3B8] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      Trigger Retry
                    </button>
                  </div>
                  <p className="text-[11px] text-[#667085] mt-2">
                    Attempts payment capture via Razorpay Test Gateway using optimized timing.
                  </p>
                </div>

                {/* Option 2: WhatsApp Dunning */}
                <div className={`p-4 rounded-xl border transition-all ${
                  workflowState !== 'RECOVERED'
                    ? 'bg-white border-[#EAECF0] hover:border-[#16A34A] shadow-xs'
                    : 'bg-[#F9FAFB] border-[#EAECF0] opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#ECFDF3] text-[#16A34A] rounded-lg">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171717]">WhatsApp 1-Click Pay Link</h4>
                        <span className="text-[10px] text-[#2563EB] font-semibold">82% Win Probability</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmAction({
                        actionType: 'SEND_PAYMENT_REMINDER',
                        title: 'Send WhatsApp 1-Click Dunning',
                        reason: 'Deliver personalized WhatsApp message with direct pre-filled UPI payment intent.'
                      })}
                      disabled={workflowState === 'RECOVERED' || actionLoading}
                      className="px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] disabled:bg-[#94A3B8] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      Send Dunning
                    </button>
                  </div>
                  <p className="text-[11px] text-[#667085] mt-2">
                    Direct instant pay token delivered to customer's verified WhatsApp.
                  </p>
                </div>

                {/* Option 3: Payment Link SMS / Email */}
                <div className={`p-4 rounded-xl border transition-all ${
                  workflowState !== 'RECOVERED'
                    ? 'bg-white border-[#EAECF0] hover:border-[#2563EB] shadow-xs'
                    : 'bg-[#F9FAFB] border-[#EAECF0] opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#EFF6FF] text-[#2563EB] rounded-lg">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171717]">SMS / Email Payment Link</h4>
                        <span className="text-[10px] text-[#667085] font-semibold">Self-Serve Checkout</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmAction({
                        actionType: 'GENERATE_PAYMENT_LINK',
                        title: 'Generate Payment Link',
                        reason: 'Generate a hosted Razorpay checkout URL and notify via SMS and email.'
                      })}
                      disabled={workflowState === 'RECOVERED' || actionLoading}
                      className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#94A3B8] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      Generate Link
                    </button>
                  </div>
                  <p className="text-[11px] text-[#667085] mt-2">
                    Creates a hosted payment page allowing customer to switch to NetBanking or Card.
                  </p>
                </div>

                {/* Option 4: Human Escalation */}
                <div className="p-4 rounded-xl border bg-white border-[#EAECF0] hover:border-[#D97706] shadow-xs transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#FFF7ED] text-[#D97706] rounded-lg">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171717]">Escalate to Human Desk</h4>
                        <span className="text-[10px] text-[#D97706] font-semibold">Priority Operations</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEscalateInput(true)}
                      disabled={workflowState === 'RECOVERED' || actionLoading}
                      className="px-3 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      Escalate
                    </button>
                  </div>
                  <p className="text-[11px] text-[#667085] mt-2">
                    Assigns case to high-value merchant success specialist with full telemetry context.
                  </p>
                </div>
              </div>

              {showEscalateInput && (
                <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-3">
                  <label className="text-xs font-bold text-[#92400E]">Escalation Reason / Notes for Specialist:</label>
                  <textarea
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="e.g., High-value enterprise account requiring manual invoice confirmation..."
                    className="w-full p-2.5 bg-white border border-[#FCD34D] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#D97706]/30"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowEscalateInput(false)}
                      className="px-3 py-1.5 bg-white border border-[#EAECF0] rounded-lg text-xs font-medium text-[#475467]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEscalateSubmit}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-[#D97706] text-white rounded-lg text-xs font-semibold hover:bg-[#B45309]"
                    >
                      Confirm Escalation
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Complete Audit Trail Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#171717]">Immutable Audit Log & Cryptographic Verification</h3>
                  <p className="text-xs text-[#667085]">Every agent decision and state transition is permanently recorded for SOC2 compliance.</p>
                </div>
                <span className="px-2.5 py-1 bg-[#F2F4F7] text-[#344054] rounded-lg text-xs font-mono font-semibold">
                  {auditLogs.length} Total Events
                </span>
              </div>

              <div className="bg-white rounded-xl border border-[#EAECF0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Actor / Agent</th>
                        <th className="py-2.5 px-3">Event</th>
                        <th className="py-2.5 px-3">Transition</th>
                        <th className="py-2.5 px-3">Reason / Details</th>
                        <th className="py-2.5 px-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAECF0]">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#F9FAFB]">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#667085] whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#171717]">
                              {log.agent}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] rounded text-[10px] font-mono font-bold">
                                {log.event}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-[#344054] whitespace-nowrap">
                              {log.previous_state} &rarr; {log.new_state}
                            </td>
                            <td className="py-2.5 px-3 text-[#344054] text-[11px] max-w-[220px] truncate" title={log.reason}>
                              {log.reason || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] font-mono text-[#16A34A] max-w-[150px] truncate">
                              {typeof log.result === 'object' ? JSON.stringify(log.result) : log.result || 'OK'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#667085]">
                            No audit log entries recorded yet for this case.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#EAECF0] bg-[#F9FAFB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDiagnostics}
              disabled={actionLoading}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#344054] hover:bg-[#F2F4F7] border border-[#EAECF0] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              Run Diagnostics
            </button>
            <button
              onClick={handleVerifyStatus}
              disabled={actionLoading}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF] border border-[#BFDBFE] transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verify Settlement
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isExceededRetry) {
                  setStatusMessage('Action blocked by policy: Max retries (2) limit reached.');
                  return;
                }
                setConfirmAction({
                  actionType: agentDecision?.recommended_action || caseData?.recommended_strategy || 'RETRY_PAYMENT',
                  title: `Execute ${agentDecision?.recommended_action?.replace(/_/g, ' ') || 'Recommended Action'}`,
                  reason: agentDecision?.reason || caseData?.reason || 'Agent analyzed failure code and scheduled automated win-back retry.'
                });
              }}
              disabled={actionLoading || caseData?.status === 'RECOVERED'}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Execute Recommended Action
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <ActionConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => handleExecuteBoundedAction(confirmAction.actionType)}
          onAdminOverride={handleAdminOverride}
          actionTitle={confirmAction.title}
          actionType={confirmAction.actionType}
          caseId={caseData?.id || caseId}
          customerName={caseData?.customer_name}
          amount={caseData?.at_risk_amount}
          recoveryProbability={agentDecision?.recovery_probability || caseData?.recovery_probability}
          currentRetryCount={retryCount}
          maxRetryLimit={2}
          reason={confirmAction.reason}
          isPolicyAllowed={!isExceededRetry}
          policyBlockedReason={isExceededRetry ? 'Max retries (2) limit reached. Bounded policy prevents customer payment fatigue.' : undefined}
        />
      )}
    </div>
  );
};
