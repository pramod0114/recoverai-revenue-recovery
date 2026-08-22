import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Zap,
  X,
  RefreshCw,
  Info,
  Lock,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onAdminOverride?: (reason: string) => Promise<void>;
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
  onAdminOverride,
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [executing, setExecuting] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

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

  const handleOverrideExecute = async () => {
    if (!overrideReason || overrideReason.trim().length < 4) {
      setOverrideError('A specific justification reason is mandatory for admin policy overrides.');
      return;
    }
    setOverrideError(null);
    try {
      setExecuting(true);
      if (onAdminOverride) {
        await onAdminOverride(overrideReason.trim());
      }
      onClose();
    } catch (err: any) {
      setOverrideError(err.message || 'Failed to execute override.');
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
              <span className="text-[#667085]">Retry Counter:</span>
              <span className="font-semibold text-[#171717]">
                {currentRetryCount} of {maxRetryLimit} retries
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
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Blocked by Bounded Safety Policy</div>
                  <div className="text-[11px] mt-0.5">
                    {policyBlockedReason ||
                      'Action exceeds maximum allowed retries (2) or customer is in cool-off period.'}
                  </div>
                </div>
              </div>

              {isAdmin ? (
                <div className="pt-2 border-t border-[#FECACA] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#991B1B]">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Admin Privilege Override
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white rounded border border-[#FECACA]">
                      Sarah Chen (ADMIN)
                    </span>
                  </div>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Enter mandatory justification e.g., 'Customer called and explicitly authorized retry attempt'..."
                    rows={2}
                    className="w-full p-2 bg-white border border-[#FCA5A5] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 placeholder-[#98A2B3]"
                  />
                  {overrideError && (
                    <div className="text-[11px] text-[#DC2626] font-semibold">{overrideError}</div>
                  )}
                </div>
              ) : (
                <div className="p-2 bg-white rounded-lg border border-[#FECACA] text-[11px] text-[#667085]">
                  <span className="font-semibold text-[#171717]">Analyst Notice:</span> You do not have permission to override safety policies. Please use <strong>"Escalate to Human Desk"</strong> for Chief Risk Officer review.
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#ECFDF3] border border-[#A7F3D0] text-[#166534] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>Policy Check: <strong>Authorized &amp; Compliant</strong></span>
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

          {!isPolicyAllowed && isAdmin ? (
            <button
              onClick={handleOverrideExecute}
              disabled={executing}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              {executing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Authorizing Override...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Authorize Admin Override</span>
                </>
              )}
            </button>
          ) : (
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
                  <span>Confirm &amp; Execute</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
