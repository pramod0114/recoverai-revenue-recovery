import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { RecoveryPolicyConfig } from '../../types';
import {
  Shield,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Lock,
  History,
  FileText,
  UserCheck,
  Zap,
  Info
} from 'lucide-react';

export const RecoveryPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<RecoveryPolicyConfig | null>(null);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const [resPol, resOvr] = await Promise.all([
        api.getPolicies(),
        api.getAdminOverrides()
      ]);
      if (resPol.data) {
        setPolicies(resPol.data);
      }
      if (resOvr.data) {
        setOverrides(resOvr.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load policy configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policies) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const res = await api.updatePolicies(policies);
      if (res.data) {
        setPolicies(res.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update recovery policies.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !policies) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#667085]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
          <span>Loading recovery policies and safety bounds...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            Recovery Safety Policies & Guardrails
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Configure system-wide guardrails, retry limits, ML execution thresholds, and audit override history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPolicies}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAECF0] hover:bg-[#F9FAFB] text-[#344054] rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl flex items-center gap-3 text-xs text-[#16A34A] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Recovery policies successfully updated and synchronized across all active agent workers.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center gap-3 text-xs text-[#DC2626]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {policies && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Policy Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Quantitative Bounds */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#171717]">Autonomous Execution Bounds</h3>
                      <p className="text-[11px] text-[#667085]">Deterministic limits controlling autonomous AI interventions.</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#2563EB] px-2.5 py-1 bg-[#EFF6FF] rounded-md border border-[#BFDBFE]">
                    STRICT COMPLIANCE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Max Retries Per Failed Payment
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={policies.max_retries}
                        onChange={(e) =>
                          setPolicies({ ...policies, max_retries: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">Hard ceiling before human escalation is enforced</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Auto-Retry Probability Threshold
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.40"
                        max="0.99"
                        value={policies.auto_retry_threshold}
                        onChange={(e) =>
                          setPolicies({ ...policies, auto_retry_threshold: parseFloat(e.target.value) || 0.7 })
                        }
                        className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">
                      ML recovery score must meet or exceed {Math.round(policies.auto_retry_threshold * 100)}% for auto-actions
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Minimum Amount for Auto-Action (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={policies.min_amount_for_auto_action}
                      onChange={(e) =>
                        setPolicies({ ...policies, min_amount_for_auto_action: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">Transactions below this value skip auto-retry</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Maximum Amount for Auto-Retry (₹)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      max="1000000"
                      value={policies.max_amount_for_auto_retry}
                      onChange={(e) =>
                        setPolicies({ ...policies, max_amount_for_auto_retry: parseInt(e.target.value, 10) || 100000 })
                      }
                      className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">High-ticket orders require human analyst confirmation</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Cooldown Interval (Seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="3600"
                      value={policies.cooldown_seconds}
                      onChange={(e) =>
                        setPolicies({ ...policies, cooldown_seconds: parseInt(e.target.value, 10) || 30 })
                      }
                      className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">Minimum delay between consecutive retry attempts</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Default Human Escalation Priority
                    </label>
                    <select
                      value={policies.escalation_priority || 'HIGH'}
                      onChange={(e) => setPolicies({ ...policies, escalation_priority: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      <option value="CRITICAL">CRITICAL (Immediate SLA &lt; 15 mins)</option>
                      <option value="HIGH">HIGH (Standard SLA &lt; 1 hour)</option>
                      <option value="MEDIUM">MEDIUM (SLA &lt; 4 hours)</option>
                    </select>
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">Queue urgency when autonomous bounds trigger escalation</span>
                  </div>
                </div>
              </div>

              {/* Safety Interlocks Toggle Box */}
              <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-3">
                  <div className="p-2 rounded-lg bg-[#F0FDF4] text-[#16A34A]">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#171717]">Safety Interlocks & Double-Billing Safeguards</h3>
                    <p className="text-[11px] text-[#667085]">Zero-tolerance policies protecting customers from duplicate debits.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={policies.stop_after_success}
                      onChange={(e) => setPolicies({ ...policies, stop_after_success: e.target.checked })}
                      className="mt-0.5 rounded text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-[#171717]">Stop Immediately After Successful Payment</div>
                      <div className="text-[#667085] mt-0.5">
                        Permanently terminates all scheduled dunning, webhooks, and retries once captured.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={policies.stop_after_max_retries}
                      onChange={(e) => setPolicies({ ...policies, stop_after_max_retries: e.target.checked })}
                      className="mt-0.5 rounded text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-[#171717]">Strict Max-Retry Circuit Breaker</div>
                      <div className="text-[#667085] mt-0.5">
                        Blocks automated system from executing subsequent retries beyond configured limit without Admin Override.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={policies.require_idempotency}
                      onChange={(e) => setPolicies({ ...policies, require_idempotency: e.target.checked })}
                      className="mt-0.5 rounded text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-[#171717]">Enforce Gateway Idempotency Keys</div>
                      <div className="text-[#667085] mt-0.5">
                        Attaches unique cryptographic hash header to Razorpay requests to prevent replay collisions.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Governance Summary & Save Box */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#171717]">Governance Authority</h3>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Only users with the <span className="font-semibold text-[#2563EB]">ADMIN</span> role are permitted to modify these system rules. Changes take effect across all background tasks and payment webhook listeners immediately.
                </p>

                <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE] text-xs space-y-2">
                  <div className="font-bold text-[#2563EB] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Real-time Enforcement
                  </div>
                  <p className="text-[#1E40AF] text-[11px]">
                    Every policy change generates an immutable entry in the compliance audit trail.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Policy Changes</span>
                  </button>
                </div>
              </div>

              {/* Policy Quick Overview */}
              <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">Active Policy Rules</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#EAECF0]">
                    <span className="text-[#667085]">Hard Decline Block:</span>
                    <span className="font-semibold text-[#16A34A]">STRICT (No Auto-Retry)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#EAECF0]">
                    <span className="text-[#667085]">Customer Fatigue Cap:</span>
                    <span className="font-semibold text-[#16A34A]">1 Notice / 24h</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#EAECF0]">
                    <span className="text-[#667085]">Max Concurrent Retries:</span>
                    <span className="font-semibold text-[#171717]">10 Workers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Admin Overrides History Table */}
      <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#FEF3F2] text-[#DC2626]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#171717]">Admin Policy Override Log</h3>
              <p className="text-[11px] text-[#667085]">Permanent historical log of human administrator policy overrides.</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F2F4F7] text-[#344054]">
            {overrides.length} Total Overrides
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Authorized By</th>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Mandatory Justification Reason</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {overrides.length > 0 ? (
                overrides.map((ovr) => (
                  <tr key={ovr.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#171717]">{ovr.actor_name || 'Pramod Mahajan'}</div>
                      <div className="text-[11px] text-[#2563EB] font-medium">{ovr.actor_role || 'ADMIN'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#171717]">
                      {ovr.case_id || ovr.entity_id}
                    </td>
                    <td className="py-3.5 px-4 text-[#344054] max-w-md">
                      <div className="p-2 bg-[#F9FAFB] rounded-md border border-[#EAECF0] text-xs">
                        "{ovr.reason || 'Manual override authorized by admin.'}"
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                        {ovr.result || 'OVERRIDE_EXECUTED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#667085]">
                      {new Date(ovr.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#667085]">
                    No admin policy overrides recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
