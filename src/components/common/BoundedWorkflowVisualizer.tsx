import React from 'react';
import {
  Brain,
  Bot,
  Compass,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowDown,
  ArrowRight,
  Sparkles,
  Lock,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

export interface BoundedWorkflowVisualizerProps {
  currentState?: string; // DETECTED, ANALYZING, RECOMMENDED, POLICY_CHECK, APPROVED, EXECUTING, VERIFYING, RECOVERED, FAILED, ESCALATED, CLOSED
  policyPassed?: boolean;
  recoveryProbability?: number;
  riskScore?: number;
  recommendedAction?: string;
  isRecovered?: boolean;
  isFailed?: boolean;
  isEscalated?: boolean;
}

export const BoundedWorkflowVisualizer: React.FC<BoundedWorkflowVisualizerProps> = ({
  currentState = 'RECOMMENDED',
  policyPassed = true,
  recoveryProbability = 0.78,
  riskScore = 0.22,
  recommendedAction = 'RETRY_PAYMENT',
  isRecovered = false,
  isFailed = false,
  isEscalated = false
}) => {
  const normState = currentState.toUpperCase();

  const isStepActive = (step: string) => {
    switch (step) {
      case 'ML_PREDICTION':
        return ['DETECTED', 'ANALYZING', 'RECOMMENDED', 'POLICY_CHECK', 'APPROVED', 'EXECUTING', 'VERIFYING', 'RECOVERED', 'CLOSED'].includes(normState);
      case 'AI_AGENT':
        return ['ANALYZING', 'RECOMMENDED', 'POLICY_CHECK', 'APPROVED', 'EXECUTING', 'VERIFYING', 'RECOVERED', 'CLOSED'].includes(normState);
      case 'DECISION':
        return ['RECOMMENDED', 'POLICY_CHECK', 'APPROVED', 'EXECUTING', 'VERIFYING', 'RECOVERED', 'CLOSED'].includes(normState);
      case 'POLICY_CHECK':
        return ['POLICY_CHECK', 'APPROVED', 'EXECUTING', 'VERIFYING', 'RECOVERED', 'CLOSED', 'BLOCKED'].includes(normState);
      case 'EXECUTE':
        return ['APPROVED', 'EXECUTING', 'VERIFYING', 'RECOVERED', 'CLOSED'].includes(normState);
      case 'VERIFY':
        return ['VERIFYING', 'RECOVERED', 'CLOSED'].includes(normState);
      case 'RECOVERED':
        return normState === 'RECOVERED' || normState === 'CLOSED' || isRecovered;
      case 'FAILED_ESCALATED':
        return normState === 'FAILED' || normState === 'ESCALATED' || normState === 'BLOCKED' || isFailed || isEscalated;
      default:
        return false;
    }
  };

  const isStepCurrent = (step: string) => {
    switch (step) {
      case 'ML_PREDICTION':
        return normState === 'DETECTED';
      case 'AI_AGENT':
        return normState === 'ANALYZING';
      case 'DECISION':
        return normState === 'RECOMMENDED';
      case 'POLICY_CHECK':
        return normState === 'POLICY_CHECK';
      case 'EXECUTE':
        return normState === 'APPROVED' || normState === 'EXECUTING';
      case 'VERIFY':
        return normState === 'VERIFYING';
      case 'RECOVERED':
        return normState === 'RECOVERED' || normState === 'CLOSED';
      case 'FAILED_ESCALATED':
        return normState === 'FAILED' || normState === 'ESCALATED' || normState === 'BLOCKED';
      default:
        return false;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[#2563EB]">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#171717] tracking-tight uppercase">
              AI Bounded Workflow Pipeline
            </h4>
            <p className="text-[11px] text-[#667085]">
              Guaranteed deterministic progression from ML signal to verified outcome
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 bg-[#F2F4F7] text-[#344054] text-[10px] font-mono font-bold rounded-full">
          STATUS: {normState}
        </span>
      </div>

      {/* Visual Workflow Nodes */}
      <div className="flex flex-col items-center gap-2 pt-1">
        {/* Node 1: ML Prediction */}
        <div
          className={`w-full max-w-md p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
            isStepCurrent('ML_PREDICTION')
              ? 'bg-[#EFF6FF] border-[#2563EB] ring-2 ring-[#93C5FD] text-[#1E40AF]'
              : isStepActive('ML_PREDICTION')
              ? 'bg-[#F9FAFB] border-[#D0D5DD] text-[#344054]'
              : 'bg-[#F9FAFB]/50 border-[#EAECF0] text-[#98A2B3]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#2563EB]" />
            <span className="font-semibold">1. ML Prediction Engine</span>
          </div>
          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#EAECF0] text-[#475467]">
            Prob: {(recoveryProbability * 100).toFixed(0)}% · Risk: {(riskScore * 100).toFixed(0)}%
          </span>
        </div>

        <ArrowDown className="w-3.5 h-3.5 text-[#98A2B3]" />

        {/* Node 2: AI Agent */}
        <div
          className={`w-full max-w-md p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
            isStepCurrent('AI_AGENT')
              ? 'bg-[#EFF6FF] border-[#2563EB] ring-2 ring-[#93C5FD] text-[#1E40AF]'
              : isStepActive('AI_AGENT')
              ? 'bg-[#F9FAFB] border-[#D0D5DD] text-[#344054]'
              : 'bg-[#F9FAFB]/50 border-[#EAECF0] text-[#98A2B3]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#7C3AED]" />
            <span className="font-semibold">2. AI Revenue Agent</span>
          </div>
          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#EAECF0] text-[#475467]">
            Model: recovery-model-v1
          </span>
        </div>

        <ArrowDown className="w-3.5 h-3.5 text-[#98A2B3]" />

        {/* Node 3: Decision */}
        <div
          className={`w-full max-w-md p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
            isStepCurrent('DECISION')
              ? 'bg-[#EFF6FF] border-[#2563EB] ring-2 ring-[#93C5FD] text-[#1E40AF]'
              : isStepActive('DECISION')
              ? 'bg-[#F9FAFB] border-[#D0D5DD] text-[#344054]'
              : 'bg-[#F9FAFB]/50 border-[#EAECF0] text-[#98A2B3]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#D97706]" />
            <span className="font-semibold">3. Candidate Decision</span>
          </div>
          <span className="font-mono text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded border border-[#BFDBFE]">
            {recommendedAction}
          </span>
        </div>

        <ArrowDown className="w-3.5 h-3.5 text-[#98A2B3]" />

        {/* Node 4: Policy Check (Allowed?) */}
        <div
          className={`w-full max-w-md p-3 rounded-xl border transition-all text-xs ${
            isStepCurrent('POLICY_CHECK')
              ? 'bg-[#FEF3F2] border-[#DC2626] ring-2 ring-[#FECACA]'
              : isStepActive('POLICY_CHECK')
              ? policyPassed
                ? 'bg-[#F0FDF4] border-[#86EFAC]'
                : 'bg-[#FEF2F2] border-[#FECACA]'
              : 'bg-[#F9FAFB]/50 border-[#EAECF0]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${policyPassed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`} />
              <span className="font-bold text-[#171717]">4. Bounded Policy Gate (Allowed?)</span>
            </div>
            <span
              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                policyPassed
                  ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                  : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
              }`}
            >
              {policyPassed ? 'PASSED & BOUNDED' : 'BLOCKED / ESCALATE'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#475467] pt-1">
            <div className="flex items-center gap-1">
              <span className="text-[#16A34A]">✓</span> Max retries &le; 3
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#16A34A]">✓</span> Prob &ge; 70%
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#16A34A]">✓</span> Value &le; ₹1,00,000
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#16A34A]">✓</span> Stop after success
            </div>
          </div>
        </div>

        <ArrowDown className="w-3.5 h-3.5 text-[#98A2B3]" />

        {/* Node 5: Execute Action */}
        <div
          className={`w-full max-w-md p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
            isStepCurrent('EXECUTE')
              ? 'bg-[#EFF6FF] border-[#2563EB] ring-2 ring-[#93C5FD] text-[#1E40AF]'
              : isStepActive('EXECUTE')
              ? 'bg-[#F9FAFB] border-[#D0D5DD] text-[#344054]'
              : 'bg-[#F9FAFB]/50 border-[#EAECF0] text-[#98A2B3]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2563EB]" />
            <span className="font-semibold">5. Execute Action (Razorpay Test Mode)</span>
          </div>
          <span className="font-mono text-[10px] bg-[#FEF3F2] text-[#B42318] px-1.5 py-0.5 rounded font-bold border border-[#FECDCA]">
            SANDBOX
          </span>
        </div>

        <ArrowDown className="w-3.5 h-3.5 text-[#98A2B3]" />

        {/* Node 6: Verify Result */}
        <div
          className={`w-full max-w-md p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
            isStepCurrent('VERIFY')
              ? 'bg-[#EFF6FF] border-[#2563EB] ring-2 ring-[#93C5FD] text-[#1E40AF]'
              : isStepActive('VERIFY')
              ? 'bg-[#F9FAFB] border-[#D0D5DD] text-[#344054]'
              : 'bg-[#F9FAFB]/50 border-[#EAECF0] text-[#98A2B3]'
          }`}
        >
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#0284C7]" />
            <span className="font-semibold">6. Verify Result (Gateway Capture Check)</span>
          </div>
          <span className="font-mono text-[10px] text-[#475467]">
            Deterministic
          </span>
        </div>

        {/* Branching Outcomes */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3 pt-2">
          {/* Branch A: Recovered -> CLOSED */}
          <div
            className={`p-3 rounded-xl border text-xs flex flex-col items-center text-center gap-1.5 transition-all ${
              isStepActive('RECOVERED')
                ? 'bg-[#ECFDF3] border-[#86EFAC] text-[#166534] shadow-xs'
                : 'bg-[#F9FAFB]/60 border-[#EAECF0] text-[#98A2B3]'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>RECOVERED</span>
            </div>
            <ArrowDown className="w-3 h-3 text-[#16A34A]" />
            <span className="px-2 py-0.5 bg-[#16A34A] text-white rounded text-[10px] font-bold font-mono">
              CLOSED
            </span>
          </div>

          {/* Branch B: Failed -> Next Action / Escalation */}
          <div
            className={`p-3 rounded-xl border text-xs flex flex-col items-center text-center gap-1.5 transition-all ${
              isStepActive('FAILED_ESCALATED')
                ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] shadow-xs'
                : 'bg-[#F9FAFB]/60 border-[#EAECF0] text-[#98A2B3]'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              <span>FAILED</span>
            </div>
            <ArrowDown className="w-3 h-3 text-[#D97706]" />
            <span className="px-2 py-0.5 bg-[#D97706] text-white rounded text-[10px] font-bold font-mono">
              ESCALATION / NEXT
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
