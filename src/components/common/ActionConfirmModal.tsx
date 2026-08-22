import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Zap,
  X,
  RefreshCw,
  Info
} from 'lucide-react';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  actionTitle: string;
  actionType: string;
  caseId: string;
  customerName?: string;
  amount: number;
  recoveryProbability?: number;
  currentRetryCount?: number;
  maxRetryLimit?: number;
  reason?: string;
  isPolicyAllowed?: boolean;
  policyBlockedReason?: string;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionTitle,
  actionType,
  caseId,
  customerName,
  amount,
  recoveryProbability = 0.65,
  currentRetryCount = 0,
  maxRetryLimit = 2,
  reason,
  isPolicyAllowed = true,
  policyBlockedReason
}) => {
  const [executing, setExecuting] = useState(false);

  if (!isOpen) return null;

  const handleExecute = async () => {
    try {
      setExecuting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xl w-full max-w-md p-6 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isPolicyAllowed
                  ? 'bg-[#EFF6FF] text-[#2563EB]'
                  : 'bg-[#FEF2F2] text-[#DC2626]'
              }`}
            >
              {isPolicyAllowed ? <Zap className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#171717]">
                {actionTitle || 'Authorize Recovery Action'}
              </h3>
              <p className="text-xs text-[#667085]">Case #{caseId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={executing}
            className="p-1 rounded-lg text-[#98A2B3] hover:text-[#171717] hover:bg-[#F2F4F7]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Details Grid */}
        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#667085]">Target Amount:</span>
              <span className="font-bold text-base text-[#171717]">{formatCurrency(amount)}</span>
            </div>
            {customerName && (
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Customer:</span>
                <span className="font-semibold text-[#344054]">{customerName}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[#667085]">Recovery Probability:</span>
              <span className="font-bold text-[#16A34A]">
                {(recoveryProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#667085]">Retry Limit:</span>
              <span className="font-semibold text-[#171717]">
                {currentRetryCount} of {maxRetryLimit} used
              </span>
            </div>
          </div>

          {reason && (
            <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF]">
              <div className="font-semibold mb-0.5">AI Strategic Justification:</div>
              <div className="leading-relaxed">{reason}</div>
            </div>
          )}

          {/* Policy Check Box */}
          {!isPolicyAllowed ? (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Blocked by Bounded Safety Policy</div>
                <div className="text-[11px] mt-0.5">
                  {policyBlockedReason ||
                    'Action exceeds maximum allowed retries (2) or customer is in cool-off period.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#ECFDF3] border border-[#A7F3D0] text-[#166534] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>Policy Check: <strong>Authorized & Compliant</strong></span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-[#EAECF0] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={executing}
            className="px-3 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={executing || !isPolicyAllowed}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            {executing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Confirm & Execute</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
