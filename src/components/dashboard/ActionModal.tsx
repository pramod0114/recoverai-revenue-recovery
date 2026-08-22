import React, { useState } from 'react';
import { X, Send, Bot, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData?: any;
  onSuccess: (msg: string) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onSuccess
}) => {
  const [actionType, setActionType] = useState('DYNAMIC_RETRY');
  const [channel, setChannel] = useState('WHATSAPP');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isOpen || !caseData) return null;

  const handleExecute = async () => {
    setLoading(true);
    setResultMessage(null);
    try {
      const res = await api.triggerRecoveryAction(caseData.id, {
        actionType,
        channel
      });
      const msg = res.data?.message || 'Action executed successfully!';
      setResultMessage(msg);
      onSuccess(msg);
      setTimeout(() => {
        onClose();
        setResultMessage(null);
      }, 1400);
    } catch (err: any) {
      setResultMessage(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Trigger AI Recovery Intervention
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Case summary */}
        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
          <div className="text-slate-400">Case ID: <span className="text-slate-200">{caseData.id}</span></div>
          <div className="text-slate-400">Customer: <span className="text-slate-200">{caseData.customer_name || caseData.customer_id}</span></div>
          <div className="text-slate-400">At-Risk Amount: <span className="text-rose-400 font-bold">₹{caseData.at_risk_amount?.toLocaleString('en-IN')}</span></div>
          <div className="text-slate-400">Primary Reason: <span className="text-amber-400">{caseData.primary_failure_diagnosis}</span></div>
        </div>

        {/* Form controls */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Select Recovery Strategy
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="DYNAMIC_RETRY">Dynamic Intelligent Retry (Off-Peak Switch)</option>
              <option value="WHATSAPP_LINK">Instant WhatsApp 1-Click Pay Link</option>
              <option value="EMAIL_DUNNING">Smart Dunning Email Sequence</option>
              <option value="SMS_PAYMENT_PROMPT">SMS Flash Prompt (UPI Deep-Link)</option>
              <option value="SWITCH_ROUTING">Switch Gateway Route (Backup Switch)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Dispatch Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['WHATSAPP', 'EMAIL', 'SMS'].map((ch) => (
                <button
                  type="button"
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`py-2 text-center rounded-lg border font-mono transition-all ${
                    channel === ch
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status result */}
        {resultMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              resultMessage.includes('Failed')
                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {resultMessage.includes('Failed') ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{resultMessage}</span>
          </div>
        )}

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleExecute}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Executing...' : 'Dispatch Intervention'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
