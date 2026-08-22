import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { SystemConfiguration } from '../../types';
import {
  Settings,
  Server,
  Database,
  Cpu,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Radio,
  Clock,
  Activity,
  Globe,
  Sliders
} from 'lucide-react';

export const SystemConfigurationPage: React.FC = () => {
  const [config, setConfig] = useState<SystemConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.getSystemConfiguration();
      if (res.data) {
        setConfig(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load system configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const res = await api.updateSystemConfiguration(config);
      if (res.data) {
        setConfig(res.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update system configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#667085]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
          <span>Loading system runtime parameters...</span>
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
            System Infrastructure & Integrations
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Global gateway environments, autonomous workers, security rate-limits, and telemetry configurations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfig}
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
          <span>System configuration saved successfully. Global parameters applied.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center gap-3 text-xs text-[#DC2626]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Integration Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Payment Gateway</span>
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
          </div>
          <div className="text-sm font-bold text-[#171717] mt-1.5">Razorpay Test Mode</div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">Webhook Active (100% SLA)</div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>ML Prediction Engine</span>
            <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
          </div>
          <div className="text-sm font-bold text-[#171717] mt-1.5">Random Forest v2.1</div>
          <div className="text-[11px] text-[#667085] mt-0.5">Inference: &lt; 45ms</div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Data Store Sync</span>
            <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
          </div>
          <div className="text-sm font-bold text-[#171717] mt-1.5">In-Memory + MySQL</div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">Synced &amp; Healthy</div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Autonomous Engine</span>
            <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
          </div>
          <div className="text-sm font-bold text-[#171717] mt-1.5">
            {config?.autonomousRecoveryEnabled ? 'ACTIVE (RUNNING)' : 'PAUSED'}
          </div>
          <div className="text-[11px] text-[#667085] mt-0.5">Bounded Policy Guard</div>
        </div>
      </div>

      {config && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Options */}
            <div className="lg:col-span-2 space-y-6">
              {/* Environment & Gateway Settings */}
              <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-3">
                  <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#171717]">Gateway & Environment Configuration</h3>
                    <p className="text-[11px] text-[#667085]">Operating mode for live transactions and simulated test environments.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Gateway Operating Mode
                    </label>
                    <select
                      value={config.gatewayMode}
                      onChange={(e) =>
                        setConfig({ ...config, gatewayMode: e.target.value as 'TEST' | 'LIVE' })
                      }
                      className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    >
                      <option value="TEST">TEST MODE (Safe Sandbox - Razorpay Mock Sandbox)</option>
                      <option value="LIVE">LIVE MODE (Production Settlement)</option>
                    </select>
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">Test mode enables risk-free simulated recovery loops</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Platform Environment Tag
                    </label>
                    <input
                      type="text"
                      value={config.environment}
                      onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">Visible on system telemetry headers</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Rate Limit Cap (Requests / Min)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="5000"
                      value={config.rateLimitPerMin}
                      onChange={(e) =>
                        setConfig({ ...config, rateLimitPerMin: parseInt(e.target.value, 10) || 300 })
                      }
                      className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">API gateway throttle protection threshold</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      JWT Auth Session Expiry (Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={config.jwtExpiryHours}
                      onChange={(e) =>
                        setConfig({ ...config, jwtExpiryHours: parseInt(e.target.value, 10) || 24 })
                      }
                      className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-xs text-[#171717] font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-[#98A2B3] mt-1 block">Maximum idle operator authentication lifespan</span>
                  </div>
                </div>
              </div>

              {/* Autonomous AI Automation Controls */}
              <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-3">
                  <div className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488]">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#171717]">Autonomous AI Recovery Automation</h3>
                    <p className="text-[11px] text-[#667085]">Control background scheduling and automated decision triggers.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={config.autonomousRecoveryEnabled}
                      onChange={(e) =>
                        setConfig({ ...config, autonomousRecoveryEnabled: e.target.checked })
                      }
                      className="mt-0.5 rounded text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-[#171717]">Enable Autonomous AI Recovery Execution</div>
                      <div className="text-[#667085] mt-0.5">
                        Allows the agent to trigger retries and customer recovery links automatically when policies pass.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={config.enableDetailedTelemetry}
                      onChange={(e) =>
                        setConfig({ ...config, enableDetailedTelemetry: e.target.checked })
                      }
                      className="mt-0.5 rounded text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-[#171717]">High-Resolution ML Feature Telemetry</div>
                      <div className="text-[#667085] mt-0.5">
                        Records microsecond timestamps and input vectors for root-cause explainability dashboards.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Save & Security Rules */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#171717]">System Actions</h3>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Modifying platform runtime configurations will update background worker schedules and rate-limit headers.
                </p>

                <div className="p-3 bg-[#F0FDF4] rounded-lg border border-[#DCFCE7] text-xs space-y-1">
                  <div className="font-bold text-[#16A34A] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> High Availability Mode
                  </div>
                  <p className="text-[#15803D] text-[11px]">
                    Automatic fallback ensures continuous operation during network anomalies.
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
                    <span>Apply Configuration</span>
                  </button>
                </div>
              </div>

              {/* Gateway API Credentials Card */}
              <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#667085]" />
                  <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">Gateway Credentials</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
                    <div className="text-[10px] font-semibold text-[#667085]">RAZORPAY_KEY_ID</div>
                    <div className="font-mono text-xs text-[#171717] mt-0.5">rzp_test_recoverai_demo_2026</div>
                  </div>
                  <div className="p-2.5 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
                    <div className="text-[10px] font-semibold text-[#667085]">WEBHOOK SIGNING SECRET</div>
                    <div className="font-mono text-xs text-[#171717] mt-0.5">••••••••••••••••••••••••</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
