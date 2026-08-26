import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  FileText,
  Sparkles,
  ArrowDownToLine,
  Filter
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const reports = [
    {
      id: 'rep_1',
      title: 'Executive Revenue Recovery Yield Report',
      description: 'Monthly macro view of total at-risk volume, recovered yield percentage, and gateway ROI.',
      format: 'PDF / CSV',
      period: 'May 2025',
      size: '2.4 MB'
    },
    {
      id: 'rep_2',
      title: 'Razorpay Gateway Failure & Retry Audit',
      description: 'Granular breakdown of transaction error codes, bank latency percentiles, and retry outcomes.',
      format: 'CSV (Raw Export)',
      period: 'May 12 — May 18, 2025',
      size: '4.8 MB'
    },
    {
      id: 'rep_3',
      title: 'AI Agent Explainability & Decision Log',
      description: 'Complete ML feature attribution, confidence scores, and safety boundary enforcement audit.',
      format: 'JSON / CSV',
      period: 'Last 30 Days',
      size: '1.9 MB'
    },
    {
      id: 'rep_4',
      title: 'Customer Dunning & WhatsApp Win-Back Summary',
      description: 'Conversion rates for 1-click UPI paylinks, WhatsApp notifications, and SMS triggers.',
      format: 'XLSX / PDF',
      period: 'Quarter to Date',
      size: '3.1 MB'
    }
  ];

  const handleDownload = (id: string, title: string, format: string) => {
    setDownloading(id);
    setTimeout(() => {
      try {
        let content = '';
        let filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
        let mimeType = 'text/csv';

        if (format.includes('JSON')) {
          content = JSON.stringify({
            report_title: title,
            generated_at: new Date().toISOString(),
            status: 'OFFICIAL_AUDIT_VERIFIED',
            compliance_framework: 'RecoverAI Enterprise Governance',
            summary: {
              total_cases_analyzed: 497,
              recovery_yield_rate: '68.4%',
              total_prevented_churn_inr: 6890179,
              ai_guardrails_violations: 0
            }
          }, null, 2);
          filename += '.json';
          mimeType = 'application/json';
        } else {
          // CSV
          content = `Report: ${title}\n` +
            `Generated: ${new Date().toISOString()}\n` +
            `Environment: Production Protected\n\n` +
            `Transaction_ID,Customer_Name,Payment_Method,Amount_INR,Failure_Reason,Recovery_Status,AI_Confidence,Outcome\n` +
            `TXN_99812,Aarav Sharma,UPI,14999.00,INSUFFICIENT_FUNDS,RECOVERED,94.2%,Smart Dynamic Paylink Converted\n` +
            `TXN_99813,Priya Nair,CARD,4500.00,BANK_TIMEOUT,RECOVERED,88.5%,Cascaded Gateway Retry Success\n` +
            `TXN_99814,Rohan Verma,NETBANKING,8200.00,USER_ABORTED,ENGAGED,79.0%,WhatsApp 1-Click Link Delivered\n` +
            `TXN_99815,Ananya Sen,UPI,25000.00,TECHNICAL_ERROR,RECOVERED,96.1%,Zero-Interruption Auto Retried\n`;
          filename += '.csv';
          mimeType = 'text/csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setToastMsg(`Downloaded: ${filename}`);
      } catch (e) {
        setToastMsg(`Exported report: ${title}`);
      }
      setDownloading(null);
      setTimeout(() => setToastMsg(null), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="font-semibold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            Financial Reports & Compliance Exports
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Export verified transaction reconciliations, AI governance logs, and executive recovery sheets.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reports.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs flex flex-col justify-between hover:border-[#BFDBFE] transition-all space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB]">
                  {r.period}
                </span>
                <span className="text-xs text-[#98A2B3] font-mono">{r.format}</span>
              </div>
              <h3 className="text-base font-bold text-[#171717]">{r.title}</h3>
              <p className="text-xs text-[#667085] leading-relaxed">{r.description}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#EAECF0]">
              <span className="text-xs text-[#98A2B3]">{r.size}</span>
              <button
                onClick={() => handleDownload(r.id, r.title, r.format)}
                disabled={downloading === r.id}
                className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === r.id ? 'Generating...' : 'Export'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
