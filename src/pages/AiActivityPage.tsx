import React, { useState } from 'react';
import {
  Cpu,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';

export const AiActivityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'decisions' | 'models' | 'policies'>('decisions');

  const decisions = [
    {
      id: 'DEC-8921',
      timestamp: '2 min ago',
      caseId: 'RC-10291',
      action: 'SMART_RETRY_OFFPEAK',
      confidence: 84,
      diagnosis: 'Temporary Bank Liquidity Timeout',
      safetyStatus: 'BOUNDED_COMPLIANT',
      evidence: '8 prior successes, peak load decay curve passed'
    },
    {
      id: 'DEC-8920',
      timestamp: '14 min ago',
      caseId: 'RC-10289',
      action: 'MANUAL_INTERVENTION',
      confidence: 42,
      diagnosis: 'Repeated Card Authentication Rejection',
      safetyStatus: 'ESCALATED_HUMAN',
      evidence: 'Max 3 retry limit reached; high LTV protection active'
    },
    {
      id: 'DEC-8919',
      timestamp: '22 min ago',
      caseId: 'RC-10288',
      action: 'DYNAMIC_RETRY',
      confidence: 79,
      diagnosis: 'Gateway 504 Timeout',
      safetyStatus: 'BOUNDED_COMPLIANT',
      evidence: 'Gateway health restored to 99.8% in last 10 minutes'
    },
    {
      id: 'DEC-8918',
      timestamp: '31 min ago',
      caseId: 'RC-10290',
      action: 'DUNNING_WHATSAPP',
      confidence: 91,
      diagnosis: 'UPI App Intent Closed',
      safetyStatus: 'BOUNDED_COMPLIANT',
      evidence: 'Customer opens WhatsApp within 4 mins of delivery'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            AI Agent Activity & Explainability
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Real-time telemetry, model feature attributions, and policy guardrails governing autonomous actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0] rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
            Agent Autonomous: ONLINE
          </span>
        </div>
      </div>

      {/* Model Specs KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs">
          <div className="text-xs font-semibold text-[#667085]">Production Model Version</div>
          <div className="text-xl font-bold text-[#171717] mt-1 flex items-center gap-2">
            <span>RecoverAI-XGB-v1.0.4</span>
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-1">
            94.2% ROC-AUC on 5,000 txns
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs">
          <div className="text-xs font-semibold text-[#667085]">Decision Latency</div>
          <div className="text-xl font-bold text-[#2563EB] mt-1">
            42ms
          </div>
          <div className="text-[11px] text-[#667085] mt-1">
            Sub-second real-time webhook inference
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs">
          <div className="text-xs font-semibold text-[#667085]">Safety Guardrails Active</div>
          <div className="text-xl font-bold text-[#16A34A] mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
            100% Compliant
          </div>
          <div className="text-[11px] text-[#667085] mt-1">
            Bounded retries & rate limiting enforced
          </div>
        </div>
      </div>

      {/* Decision Table */}
      <div className="bg-white rounded-xl border border-[#EAECF0] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#EAECF0] bg-[#F9FAFB] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#171717]">Recent Autonomous AI Decisions</h3>
          <span className="text-xs text-[#667085]">Live feed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-[#667085] font-semibold border-b border-[#EAECF0] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Decision ID</th>
                <th className="py-3 px-4">Case</th>
                <th className="py-3 px-4">Action Chosen</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">AI Diagnostic Evidence</th>
                <th className="py-3 px-4">Safety Status</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {decisions.map((d) => (
                <tr key={d.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#171717]">{d.id}</td>
                  <td className="py-3.5 px-4 font-mono text-[#2563EB] font-medium">#{d.caseId}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#171717]">
                    {d.action.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-[#2563EB]">{d.confidence}%</span>
                  </td>
                  <td className="py-3.5 px-4 text-[#475467] max-w-[280px]">
                    <div className="font-medium text-[#171717]">{d.diagnosis}</div>
                    <div className="text-[11px] text-[#667085] truncate">{d.evidence}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0]">
                      {d.safetyStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#98A2B3]">{d.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
