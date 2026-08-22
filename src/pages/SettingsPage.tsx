import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Zap,
  Sliders,
  Bell,
  Key,
  CheckCircle2,
  Lock,
  Save
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [autoApproveConfidence, setAutoApproveConfidence] = useState(80);
  const [maxRetries, setMaxRetries] = useState(3);
  const [enableWhatsApp, setEnableWhatsApp] = useState(true);
  const [enableSms, setEnableSms] = useState(true);
  const [enableEmail, setEnableEmail] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
          Recovery Engine Settings
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Configure autonomous win-back thresholds, customer communication channels, and safety bounding rules.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          <span>Settings saved and deployed to AI decision pipeline.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: AI Autonomy & Confidence Thresholds */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
            <Zap className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#171717]">Autonomous AI Thresholds</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-[#171717] mb-1">
                <span>Auto-Approve Confidence Threshold: {autoApproveConfidence}%</span>
                <span className="text-[#2563EB]">High Precision</span>
              </div>
              <p className="text-[11px] text-[#667085] mb-2">
                Cases with predicted win-back probability &ge; {autoApproveConfidence}% will be executed automatically without requiring human analyst review.
              </p>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={autoApproveConfidence}
                onChange={(e) => setAutoApproveConfidence(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>

            <div className="pt-3 border-t border-[#F2F4F7]">
              <label className="block font-semibold text-[#171717] mb-1">
                Max Allowed Retry Attempts Per Case
              </label>
              <p className="text-[11px] text-[#667085] mb-2">
                Bounded ceiling prevents card processor penalties and customer fatigue.
              </p>
              <select
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-3 py-1.5 text-xs text-[#344054] font-medium focus:outline-none focus:border-[#2563EB]"
              >
                <option value={1}>1 Retry (Conservative)</option>
                <option value={2}>2 Retries (Balanced)</option>
                <option value={3}>3 Retries (Recommended Default)</option>
                <option value={4}>4 Retries (Aggressive)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Dunning Channels */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
            <Bell className="w-4 h-4 text-[#16A34A]" />
            <h3 className="text-sm font-bold text-[#171717]">Communication Channels</h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-lg border border-[#EAECF0] hover:bg-[#F9FAFB] cursor-pointer">
              <div>
                <div className="font-semibold text-[#171717]">WhatsApp 1-Click PayLink</div>
                <div className="text-[11px] text-[#667085]">
                  Instant WhatsApp UPI mandate and payment link push (Highest conversion)
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableWhatsApp}
                onChange={(e) => setEnableWhatsApp(e.target.checked)}
                className="w-4 h-4 accent-[#2563EB] rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border border-[#EAECF0] hover:bg-[#F9FAFB] cursor-pointer">
              <div>
                <div className="font-semibold text-[#171717]">SMS Payment Link Dunning</div>
                <div className="text-[11px] text-[#667085]">
                  Fallback SMS notification for non-WhatsApp users
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableSms}
                onChange={(e) => setEnableSms(e.target.checked)}
                className="w-4 h-4 accent-[#2563EB] rounded"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save & Apply Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
