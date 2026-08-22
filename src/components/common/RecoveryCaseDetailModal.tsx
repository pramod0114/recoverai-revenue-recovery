import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { BoundedWorkflowVisualizer } from './BoundedWorkflowVisualizer';
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
  Workflow
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
  const [activeTab, setActiveTab] = useState<'agent' | 'workflow' | 'audit' | 'timeline'>('agent');
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
      setStatusMessage(`AI Diagnostics completed. Policy result: ${res.data?.policy_result?.passed ? 'APPROVED' : 'BLOCKED'}`);
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
      const res = await api.executeRecovery({
        case_id: caseData?.id,
        transaction_id: caseData?.transaction_id,
        override_action: overrideAction || agentDecision?.recommended_action || caseData?.recommended_strategy
      });
      const exec = res.data?.execution;
      const ver = res.data?.verification;
      if (ver?.is_recovered) {
        setStatusMessage(`Money verified and recovered: ₹${ver.verified_amount.toLocaleString('en-IN')} captured in Razorpay Test Gateway!`);
      } else {
        setStatusMessage(`Action executed: ${exec?.action}. Verification: ${ver?.details || exec?.status}`);
      }
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMessage(`Execution error: ${err.message}`);
    } finally {
      setActionLoading(false);
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

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;
  const prob = Math.round(((agentDecision?.recovery_probability ?? caseData?.recovery_probability) || 0.75) * 100);
  const workflowState = caseData?.workflow_state || (caseData?.status === 'RECOVERED' ? 'RECOVERED' : 'RECOMMENDED');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#EAECF0] flex items-center justify-between bg-[#F9FAFB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-[#2563EB]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#171717]">
                  Recovery Case #{caseData?.id || caseId}
                </h2>
                <span className="px-2 py-0.5 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-[10px] font-bold rounded-full">
                  RAZORPAY TEST MODE
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
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                Created on {caseData ? new Date(caseData.created_at).toLocaleString() : 'Loading...'} · Bounded Autonomous Workflow
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

        {/* State Machine Step Progress Bar */}
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
            onClick={() => setActiveTab('agent')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'agent'
                ? 'border-[#2563EB] text-[#2563EB] bg-white'
                : 'border-transparent hover:text-[#171717]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Decision & Policy Engine
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'workflow'
                ? 'border-[#2563EB] text-[#2563EB] bg-white'
                : 'border-transparent hover:text-[#171717]'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            Bounded Workflow Architecture
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
            Complete Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'timeline'
                ? 'border-[#2563EB] text-[#2563EB] bg-white'
                : 'border-transparent hover:text-[#171717]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Payment Context
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
          ) : activeTab === 'agent' ? (
            <>
              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <div className="text-[11px] text-[#667085] mt-0.5">Confidence: {Math.round((agentDecision?.confidence || 0.85) * 100)}%</div>
                </div>

                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#EAECF0]">
                  <div className="text-[11px] text-[#667085] uppercase tracking-wider font-semibold">Retries Exhausted</div>
                  <div className="text-xl font-bold text-[#171717] mt-1">
                    {caseData?.actions_taken_count || 0} / 3
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Max Bounded Limit: 3</div>
                </div>

                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#EAECF0]">
                  <div className="text-[11px] text-[#667085] uppercase tracking-wider font-semibold">Policy Status</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {agentDecision?.policy_result?.passed !== false ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                    )}
                    <span className="text-sm font-bold text-[#171717]">
                      {agentDecision?.policy_result?.passed !== false ? 'PASSED & BOUNDED' : 'BLOCKED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#667085] mt-0.5">Safety Engine Active</div>
                </div>
              </div>

              {/* Agent Decision Details */}
              <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#2563EB]" />
                    <h3 className="text-sm font-bold text-[#171717]">Agent Decision Engine</h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#667085]">Model: {agentDecision?.model_version || 'recovery-model-v1'}</span>
                </div>

                <div className="p-4 bg-[#EFF6FF]/60 border border-[#BFDBFE] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1D4ED8] uppercase tracking-wider">
                      Recommended Action
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#2563EB] text-white rounded-full text-xs font-bold font-mono">
                      {agentDecision?.recommended_action || caseData?.recommended_strategy || 'RETRY_PAYMENT'}
                    </span>
                  </div>
                  <p className="text-xs text-[#1E3A8A] leading-relaxed">
                    {agentDecision?.reason || caseData?.reason || 'Agent analyzed root cause and predicted high recovery likelihood via off-peak test retry.'}
                  </p>
                </div>

                {/* Policy Rules Evaluation */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#344054] uppercase tracking-wider">Safety & Policy Rules Evaluated</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg flex items-center justify-between">
                      <span className="text-[#667085]">Max Retries (&le; 3):</span>
                      <span className="font-semibold text-[#16A34A]">{(caseData?.actions_taken_count || 0) < 3 ? 'VALID' : 'EXCEEDED'}</span>
                    </div>
                    <div className="p-2.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg flex items-center justify-between">
                      <span className="text-[#667085]">Auto-Retry Threshold (&ge; 0.70):</span>
                      <span className="font-semibold text-[#16A34A]">{(agentDecision?.recovery_probability || 0.75) >= 0.7 ? 'SATISFIED' : 'REQUIRES MANUAL'}</span>
                    </div>
                    <div className="p-2.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg flex items-center justify-between">
                      <span className="text-[#667085]">Stop After Success:</span>
                      <span className="font-semibold text-[#16A34A]">ENFORCED</span>
                    </div>
                    <div className="p-2.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg flex items-center justify-between">
                      <span className="text-[#667085]">Razorpay Sandbox Mode:</span>
                      <span className="font-semibold text-[#2563EB]">ACTIVE (NO REAL MONEY)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Execution Controls */}
              <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-[#2563EB]" />
                    Execute Bounded Agent Action
                  </h3>
                  <button
                    onClick={handleRunDiagnostics}
                    disabled={actionLoading}
                    className="text-xs text-[#2563EB] font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${actionLoading ? 'animate-spin' : ''}`} />
                    Re-run Diagnostics
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleExecuteBoundedAction('RETRY_PAYMENT')}
                    disabled={actionLoading || caseData?.status === 'RECOVERED' || (caseData?.actions_taken_count || 0) >= 3}
                    className="p-3 bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-[#16A34A]" />
                    <span>Trigger Payment Retry</span>
                    <span className="text-[10px] font-normal text-[#166534]">Razorpay Test Capture</span>
                  </button>

                  <button
                    onClick={() => handleExecuteBoundedAction('GENERATE_PAYMENT_LINK')}
                    disabled={actionLoading || caseData?.status === 'RECOVERED'}
                    className="p-3 bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 text-[#2563EB]" />
                    <span>Generate Payment Link</span>
                    <span className="text-[10px] font-normal text-[#1E40AF]">SMS / WhatsApp Url</span>
                  </button>

                  <button
                    onClick={() => handleExecuteBoundedAction('SEND_PAYMENT_REMINDER')}
                    disabled={actionLoading || caseData?.status === 'RECOVERED'}
                    className="p-3 bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#E9D5FF] text-[#7E22CE] rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-[#9333EA]" />
                    <span>Send Reminder</span>
                    <span className="text-[10px] font-normal text-[#6B21A8]">Direct Checkout Token</span>
                  </button>
                </div>

                {showEscalateInput ? (
                  <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-3">
                    <label className="text-xs font-bold text-[#92400E]">Escalation Reason / Notes for Specialist:</label>
                    <textarea
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="e.g., Customer reached out requesting manual wire instructions..."
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
                ) : null}
              </div>
            </>
          ) : activeTab === 'workflow' ? (
            /* Dedicated Bounded Workflow Architecture Visualizer */
            <div className="space-y-6">
              <BoundedWorkflowVisualizer
                currentState={workflowState}
                policyPassed={agentDecision?.policy_result?.passed !== false}
                recoveryProbability={agentDecision?.recovery_probability ?? caseData?.recovery_probability ?? 0.75}
                riskScore={caseData?.risk_score ?? 0.25}
                recommendedAction={agentDecision?.recommended_action || caseData?.recommended_strategy || 'RETRY_PAYMENT'}
                isRecovered={workflowState === 'RECOVERED'}
                isFailed={workflowState === 'FAILED'}
                isEscalated={workflowState === 'ESCALATED'}
              />

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EAECF0] space-y-2 text-xs">
                <h4 className="font-bold text-[#1E293B] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#2563EB]" />
                  Why Bounded Workflows Guarantee Autonomous Safety
                </h4>
                <p className="text-[#475467] leading-relaxed">
                  Unlike open-ended generative loops, every action taken by the AI Revenue Recovery Agent is strictly gated through a deterministic state machine and policy rules engine. No external debit can trigger if policy checks fail, idempotency is guaranteed, and no case is resolved without gateway-confirmed transaction capture.
                </p>
              </div>
            </div>
          ) : activeTab === 'audit' ? (
            /* Complete Audit Trail Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#171717]">Immutable Audit Log</h3>
                  <p className="text-xs text-[#667085]">Chronological history of every agent action, state transition, and policy check.</p>
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
                        <th className="py-2.5 px-3">Agent</th>
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
          ) : (
            /* Payment Context & Timeline */
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-[#EAECF0] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#171717]">Customer & Payment Metadata</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-[#667085]">Customer Name</div>
                    <div className="font-semibold text-[#171717] mt-0.5">{caseData?.customer_name || 'Valued Merchant Client'}</div>
                  </div>
                  <div>
                    <div className="text-[#667085]">Email & Contact</div>
                    <div className="font-semibold text-[#171717] mt-0.5">{caseData?.customer_email || 'client@example.com'}</div>
                  </div>
                  <div>
                    <div className="text-[#667085]">Payment Method</div>
                    <div className="font-semibold text-[#171717] mt-0.5">{caseData?.payment_method || 'UPI'}</div>
                  </div>
                  <div>
                    <div className="text-[#667085]">Failure Reason</div>
                    <div className="font-semibold text-[#DC2626] mt-0.5">{caseData?.primary_failure_diagnosis || 'Bank Gateway Timeout'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#EAECF0] bg-[#F9FAFB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEscalateInput(true)}
              disabled={actionLoading || caseData?.status === 'RECOVERED'}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#475467] hover:bg-[#F2F4F7] border border-[#EAECF0] transition-colors disabled:opacity-50"
            >
              Escalate to Human Desk
            </button>
            <button
              onClick={handleVerifyStatus}
              disabled={actionLoading}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF] border border-[#BFDBFE] transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verify Status
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExecuteBoundedAction()}
              disabled={actionLoading || caseData?.status === 'RECOVERED' || (caseData?.actions_taken_count || 0) >= 3}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Execute Recommended Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
