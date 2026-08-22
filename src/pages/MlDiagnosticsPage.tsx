import React, { useState } from 'react';
import { Cpu, CheckCircle2, Play, Zap, Database, Layers, ArrowRight } from 'lucide-react';

export const MlDiagnosticsPage: React.FC = () => {
  const [testAmount, setTestAmount] = useState(4999);
  const [testMethod, setTestMethod] = useState('AUTO_DEBIT');
  const [testCode, setTestCode] = useState('BAD_REQUEST_INSUFFICIENT_FUNDS');
  const [prediction, setPrediction] = useState<any>(null);

  const simulateInference = () => {
    // Client simulation of FastAPI ML inference endpoint
    let prob = 0.82;
    let strategy = 'SMART_RETRY_OFFPEAK';
    let channel = 'WHATSAPP';
    let delay = 24;
    let explain = 'Detected insufficient balance cycle. Recommend scheduled off-peak debit alignment.';

    if (testCode.includes('EXPIRED')) {
      prob = 0.74;
      strategy = 'ONE_CLICK_MANDATE_UPDATE';
      channel = 'EMAIL';
      delay = 1;
      explain = 'Card expired. Requires dynamic tokenized mandate refresh link.';
    } else if (testCode.includes('DOWN') || testCode.includes('TIMEOUT')) {
      prob = 0.89;
      strategy = 'METHOD_SWITCH_UPI';
      channel = 'SMS';
      delay = 2;
      explain = 'Bank switch gateway timeout. Direct UPI intent fallback yields highest recovery rate.';
    } else if (testCode.includes('ABANDON') || testCode.includes('DROPOUT')) {
      prob = 0.58;
      strategy = 'DUNNING_WHATSAPP';
      channel = 'WHATSAPP';
      delay = 1;
      explain = 'Checkout drop detected. Instant conversational WhatsApp recovery link dispatched.';
    }

    setPrediction({
      transaction_id: `sim_${Date.now()}`,
      ml_recovery_probability: prob,
      recommended_strategy: strategy,
      optimal_retry_delay_hours: delay,
      recommended_channel: channel,
      risk_level: prob >= 0.75 ? 'LOW' : 'MEDIUM',
      confidence_score: 0.88,
      explainability_factors: [explain, 'Customer historical success ratio: 0.86']
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <span>Python ML Intelligence Microservice Architecture</span>
          <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
            FastAPI + Scikit-Learn
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          ML diagnostics engine structure for predictive recovery probability, optimal dunning routing, and smart retry scheduling (Part 1 Foundation)
        </p>
      </div>

      {/* Grid of Microservice specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold font-sans">
            <Cpu className="w-4 h-4" />
            <span>FastAPI Endpoints</span>
          </div>
          <div className="text-slate-300 space-y-1 text-[11px]">
            <div>GET /health</div>
            <div>GET /api/v1/model-info</div>
            <div>POST /api/v1/predict-recovery-score</div>
            <div>POST /api/v1/batch-diagnose</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-sky-400 font-semibold font-sans">
            <Layers className="w-4 h-4" />
            <span>Feature Pipeline</span>
          </div>
          <div className="text-slate-300 space-y-1 text-[11px]">
            <div>• Log Amount & Log Spend</div>
            <div>• Payment Method Categorical</div>
            <div>• Failure Root Category</div>
            <div>• Historical Success Ratio</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold font-sans">
            <Database className="w-4 h-4" />
            <span>Training Dataset</span>
          </div>
          <div className="text-slate-300 space-y-1 text-[11px]">
            <div>• 5,000 Synthetic Transactions</div>
            <div>• Realistic failure distributions</div>
            <div>• Supervised Win-Back Target</div>
            <div>• GradientBoostingClassifier</div>
          </div>
        </div>
      </div>

      {/* Interactive Inference Simulator */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Inference Diagnostic Test Workbench</span>
            </h3>
            <p className="text-xs text-slate-400">
              Test how the ML engine diagnoses failure codes and recommends recovery strategies
            </p>
          </div>
          <button
            onClick={simulateInference}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Diagnosis</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-mono">Amount (INR)</label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-mono">Payment Method</label>
            <select
              value={testMethod}
              onChange={(e) => setTestMethod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="AUTO_DEBIT">AUTO_DEBIT</option>
              <option value="CARD_CREDIT">CARD_CREDIT</option>
              <option value="CARD_DEBIT">CARD_DEBIT</option>
              <option value="NETBANKING">NETBANKING</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-mono">Failure Code</label>
            <select
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="BAD_REQUEST_INSUFFICIENT_FUNDS">BAD_REQUEST_INSUFFICIENT_FUNDS</option>
              <option value="CARD_ERROR_EXPIRED">CARD_ERROR_EXPIRED</option>
              <option value="GATEWAY_ERROR_ISSUER_DOWN">GATEWAY_ERROR_ISSUER_DOWN</option>
              <option value="CHECKOUT_USER_DROPOUT">CHECKOUT_USER_DROPOUT</option>
            </select>
          </div>
        </div>

        {/* Prediction Results Preview */}
        {prediction && (
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs animate-in fade-in">
            <div className="text-emerald-400 font-semibold font-sans flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Inference Result Received:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-300">
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Recovery Probability:</div>
                <div className="text-lg font-bold text-emerald-400">
                  {(prediction.ml_recovery_probability * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Recommended Strategy:</div>
                <div className="text-sm font-semibold text-slate-100">
                  {prediction.recommended_strategy}
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Optimal Delay:</div>
                <div className="text-sm font-semibold text-amber-400">
                  +{prediction.optimal_retry_delay_hours} Hours
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Recommended Channel:</div>
                <div className="text-sm font-semibold text-sky-400">
                  {prediction.recommended_channel}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-1">
              Explainability: <span className="text-slate-200">{prediction.explainability_factors[0]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
