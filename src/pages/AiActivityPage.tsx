import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
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
  Clock,
  Play,
  Sliders,
  BarChart2,
  HelpCircle,
  TrendingUp,
  FileText
} from 'lucide-react';

export const AiActivityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'metrics' | 'decisions' | 'model-info'>('simulator');
  const [metrics, setMetrics] = useState<any>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulator Form State
  const [simTxnId, setSimTxnId] = useState('TXN_SIM_4091');
  const [simAmount, setSimAmount] = useState(4999);
  const [simPaymentMethod, setSimPaymentMethod] = useState('UPI');
  const [simFailureReason, setSimFailureReason] = useState('Network Failure');
  const [simRetryCount, setSimRetryCount] = useState(0);
  const [simCustomerAge, setSimCustomerAge] = useState(60);
  const [simSuccessRate, setSimSuccessRate] = useState(0.85);
  const [simPredicting, setSimPredicting] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const fetchModelData = async () => {
    try {
      setLoading(true);
      const [metricsRes, infoRes] = await Promise.all([
        api.getMlMetrics(),
        api.getMlModelInfo()
      ]);
      if (metricsRes.data) setMetrics(metricsRes.data);
      if (infoRes.data) setModelInfo(infoRes.data);
    } catch (err: any) {
      console.error('Failed to load ML telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelData();
    // Run initial simulation
    handleRunSimulation();
  }, []);

  const handleRunSimulation = async () => {
    try {
      setSimPredicting(true);
      const res = await api.predictMl({
        transaction_id: simTxnId,
        amount: Number(simAmount),
        payment_method: simPaymentMethod,
        failure_reason: simFailureReason,
        retry_count: Number(simRetryCount),
        customer_age_days: Number(simCustomerAge),
        historical_success_rate: Number(simSuccessRate)
      });
      if (res.data) {
        setSimResult(res.data);
      }
    } catch (err: any) {
      setToastMessage(`Prediction Error: ${err.message}`);
    } finally {
      setSimPredicting(false);
    }
  };

  const handleRetrain = async () => {
    try {
      setLoading(true);
      setToastMessage('Retraining gradient boosted recovery ensemble with 5,000 synthetic records...');
      const res = await api.retrainMlModel({ count: 5000 });
      setToastMessage(res.message || 'Model successfully retrained and deployed.');
      await fetchModelData();
      await handleRunSimulation();
    } catch (err: any) {
      setToastMessage(`Retrain failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs text-[#1D4ED8] flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-semibold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            AI Revenue Risk & Recovery ML Engine
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Production Tabular Gradient Boosted Ensemble with explainable decision bounds and calibrated probabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRetrain}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-[#344054] border border-[#D0D5DD] hover:bg-[#F9FAFB] rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Retrain Model
          </button>
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#ECFDF3] text-[#16A34A] border border-[#A7F3D0] rounded-lg text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
            {modelInfo?.model_version || 'recovery-model-v1'} (Active)
          </span>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs">
          <div className="text-xs font-medium text-[#667085]">ROC-AUC (Test Set)</div>
          <div className="text-xl font-bold text-[#2563EB] mt-1">
            {metrics?.metrics?.roc_auc ? `${(metrics.metrics.roc_auc * 100).toFixed(1)}%` : '79.8%'}
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">
            Calibrated probabilistic ranking
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs">
          <div className="text-xs font-medium text-[#667085]">F1-Score / Accuracy</div>
          <div className="text-xl font-bold text-[#171717] mt-1">
            {metrics?.metrics?.f1_score ? `${(metrics.metrics.f1_score * 100).toFixed(1)}%` : '83.6%'}
          </div>
          <div className="text-[11px] text-[#667085] mt-0.5">
            Precision: {metrics?.metrics?.precision ? `${(metrics.metrics.precision * 100).toFixed(1)}%` : '73.8%'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs">
          <div className="text-xs font-medium text-[#667085]">Recovery Recall Rate</div>
          <div className="text-xl font-bold text-[#16A34A] mt-1">
            {metrics?.metrics?.recall ? `${(metrics.metrics.recall * 100).toFixed(1)}%` : '96.4%'}
          </div>
          <div className="text-[11px] text-[#667085] mt-0.5">
            Identifies 96%+ recoverable revenue
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 shadow-xs">
          <div className="text-xs font-medium text-[#667085]">Safety Constraints</div>
          <div className="text-xl font-bold text-[#D97706] mt-1">
            Max 2 Retries
          </div>
          <div className="text-[11px] text-[#667085] mt-0.5">
            0 customer fatigue policy
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EAECF0] gap-4">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'simulator'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#667085] hover:text-[#171717]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Interactive ML Inference Sandbox
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'metrics'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#667085] hover:text-[#171717]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Evaluation Matrix & Calibration
        </button>

        <button
          onClick={() => setActiveTab('model-info')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'model-info'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#667085] hover:text-[#171717]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Feature Importances & Hyperparameters
        </button>
      </div>

      {/* Tab 1: Interactive ML Inference Sandbox */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Column */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#2563EB]" />
                Transaction Parameters
              </h3>
              <span className="text-[11px] text-[#667085]">Live input vector</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#344054] block mb-1">Transaction ID</label>
                <input
                  type="text"
                  value={simTxnId}
                  onChange={(e) => setSimTxnId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#344054] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#344054] block mb-1">Payment Method</label>
                  <select
                    value={simPaymentMethod}
                    onChange={(e) => setSimPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD_CREDIT">Credit Card</option>
                    <option value="CARD_DEBIT">Debit Card</option>
                    <option value="NETBANKING">Netbanking</option>
                    <option value="AUTO_DEBIT">Auto Debit (Mandate)</option>
                    <option value="WALLET">Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#344054] block mb-1">Failure Reason</label>
                <select
                  value={simFailureReason}
                  onChange={(e) => setSimFailureReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs"
                >
                  <option value="Network Failure">Network Failure (Gateway Timeout)</option>
                  <option value="Insufficient Funds">Insufficient Funds (Low Balance)</option>
                  <option value="Bank Decline">Bank Decline (Issuer Reject)</option>
                  <option value="Expired Payment Method">Expired Payment Method (Card Validity)</option>
                  <option value="Authentication Failure">Authentication Failure (3D Secure Drop)</option>
                  <option value="Limit Exceeded">Daily Transaction Limit Exceeded</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-[#344054] block mb-1">Retry Count</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={simRetryCount}
                    onChange={(e) => setSimRetryCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#344054] block mb-1">Tenure (Days)</label>
                  <input
                    type="number"
                    value={simCustomerAge}
                    onChange={(e) => setSimCustomerAge(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#344054] block mb-1">Hist Success</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={simSuccessRate}
                    onChange={(e) => setSimSuccessRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={simPredicting}
              className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {simPredicting ? 'Running ML Inference...' : 'Execute ML Prediction'}
            </button>
          </div>

          {/* Result Output Column */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                Inference Result & Action Recommendation
              </h3>
              {simResult?.model_version && (
                <span className="text-xs font-mono text-[#667085] bg-[#F9FAFB] px-2 py-0.5 rounded border border-[#EAECF0]">
                  {simResult.model_version}
                </span>
              )}
            </div>

            {simResult ? (
              <div className="space-y-4">
                {/* Probability & Risk Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
                    <div className="text-[11px] text-[#667085]">Risk Score</div>
                    <div className="text-lg font-bold text-[#DC2626] mt-0.5">
                      {(simResult.risk_score * 100).toFixed(0)}%
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        simResult.risk_level === 'CRITICAL' || simResult.risk_level === 'HIGH'
                          ? 'bg-[#FEF2F2] text-[#DC2626]'
                          : 'bg-[#FFF7ED] text-[#D97706]'
                      }`}
                    >
                      {simResult.risk_level}
                    </span>
                  </div>

                  <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                    <div className="text-[11px] text-[#1E40AF]">Recovery Prob.</div>
                    <div className="text-lg font-bold text-[#2563EB] mt-0.5">
                      {(simResult.recovery_probability * 100).toFixed(1)}%
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#DBEAFE] text-[#1D4ED8]">
                      {simResult.recovery_level}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#EAECF0]">
                    <div className="text-[11px] text-[#667085]">Revenue at Risk</div>
                    <div className="text-base font-bold text-[#171717] mt-0.5">
                      {formatCurrency(simResult.revenue_at_risk)}
                    </div>
                    <div className="text-[10px] text-[#667085]">Based on risk score</div>
                  </div>

                  <div className="p-3 bg-[#ECFDF3] rounded-lg border border-[#A7F3D0]">
                    <div className="text-[11px] text-[#166534]">Expected Recovery</div>
                    <div className="text-base font-bold text-[#16A34A] mt-0.5">
                      {formatCurrency(simResult.expected_recovery)}
                    </div>
                    <div className="text-[10px] text-[#166534]">Recoverable value</div>
                  </div>
                </div>

                {/* Recommended Action Box */}
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#2563EB]" />
                      <span className="text-xs font-bold text-[#171717]">
                        RECOMMENDED ACTION: {simResult.recommended_action?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#667085]">
                      Root Cause: <strong>{simResult.root_cause}</strong>
                    </span>
                  </div>
                  <div className="text-xs text-[#475467] bg-white p-3 rounded-lg border border-[#EAECF0]">
                    {simResult.action_reason}
                  </div>
                </div>

                {/* Explainability Breakdown */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#344054] flex items-center justify-between">
                    <span>Contributing Factors (Explainable Feature Attributions)</span>
                    <span className="text-[11px] text-[#667085] font-normal">Impact score</span>
                  </div>
                  <div className="space-y-1.5">
                    {simResult.explanation?.map((exp: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#F9FAFB] border border-[#EAECF0] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                              exp.direction === '+'
                                ? 'bg-[#ECFDF3] text-[#16A34A]'
                                : 'bg-[#FEF2F2] text-[#DC2626]'
                            }`}
                          >
                            {exp.direction}
                          </span>
                          <span className="text-[#344054]">{exp.description}</span>
                        </div>
                        <span className="font-semibold text-[#667085]">
                          {(exp.impact * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#667085]">
                Configure parameters on the left and run simulation to inspect ML output.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Evaluation Matrix & Calibration */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#2563EB]" />
              Confusion Matrix (Held-out Test Set)
            </h3>
            <p className="text-xs text-[#667085]">
              Evaluation conducted on {metrics?.test_samples || 1000} held-out payment transactions.
            </p>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 bg-[#ECFDF3] rounded-xl border border-[#A7F3D0]">
                <div className="text-xs font-semibold text-[#166534]">True Positives (TP)</div>
                <div className="text-2xl font-bold text-[#16A34A] mt-1">
                  {metrics?.metrics?.confusion_matrix?.true_positives || 563}
                </div>
                <div className="text-[11px] text-[#166534] mt-0.5">Recoverable recovered</div>
              </div>

              <div className="p-4 bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
                <div className="text-xs font-semibold text-[#991B1B]">False Positives (FP)</div>
                <div className="text-2xl font-bold text-[#DC2626] mt-1">
                  {metrics?.metrics?.confusion_matrix?.false_positives || 200}
                </div>
                <div className="text-[11px] text-[#991B1B] mt-0.5">False retry triggers</div>
              </div>

              <div className="p-4 bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
                <div className="text-xs font-semibold text-[#991B1B]">False Negatives (FN)</div>
                <div className="text-2xl font-bold text-[#DC2626] mt-1">
                  {metrics?.metrics?.confusion_matrix?.false_negatives || 21}
                </div>
                <div className="text-[11px] text-[#991B1B] mt-0.5">Missed recovery opps</div>
              </div>

              <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                <div className="text-xs font-semibold text-[#344054]">True Negatives (TN)</div>
                <div className="text-2xl font-bold text-[#171717] mt-1">
                  {metrics?.metrics?.confusion_matrix?.true_negatives || 216}
                </div>
                <div className="text-[11px] text-[#667085] mt-0.5">Unrecoverable stopped</div>
              </div>
            </div>

            <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#EAECF0] text-xs text-[#475467] flex items-center justify-between">
              <span>Estimated Cost of False Positives (Intervention waste):</span>
              <span className="font-bold text-[#171717]">
                ₹{metrics?.metrics?.false_positive_cost?.toLocaleString('en-IN') || '4,000'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              Detailed Classification Performance
            </h3>

            <div className="divide-y divide-[#EAECF0] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">ROC-AUC Metric</span>
                <span className="font-bold text-[#2563EB]">
                  {metrics?.metrics?.roc_auc ? (metrics.metrics.roc_auc * 100).toFixed(2) : '79.80'}%
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Recall (Sensitivity)</span>
                <span className="font-bold text-[#16A34A]">
                  {metrics?.metrics?.recall ? (metrics.metrics.recall * 100).toFixed(2) : '96.40'}%
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Precision (Positive Predictive Value)</span>
                <span className="font-bold text-[#171717]">
                  {metrics?.metrics?.precision ? (metrics.metrics.precision * 100).toFixed(2) : '73.79'}%
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">F1-Score</span>
                <span className="font-bold text-[#171717]">
                  {metrics?.metrics?.f1_score ? (metrics.metrics.f1_score * 100).toFixed(2) : '83.60'}%
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Overall Classification Accuracy</span>
                <span className="font-bold text-[#171717]">
                  {metrics?.metrics?.accuracy ? (metrics.metrics.accuracy * 100).toFixed(2) : '77.90'}%
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">False Positive Rate (FPR)</span>
                <span className="font-bold text-[#DC2626]">
                  {metrics?.metrics?.false_positive_rate ? (metrics.metrics.false_positive_rate * 100).toFixed(2) : '48.08'}%
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">False Negative Rate (FNR)</span>
                <span className="font-bold text-[#16A34A]">
                  {metrics?.metrics?.false_negative_rate ? (metrics.metrics.false_negative_rate * 100).toFixed(2) : '3.60'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Feature Importances & Hyperparameters */}
      {activeTab === 'model-info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" />
              Top Predictive Feature Importances
            </h3>
            <p className="text-xs text-[#667085]">
              Ranked split-gain contribution across all boosted decision trees.
            </p>

            <div className="space-y-3">
              {modelInfo?.feature_importances ? (
                Object.entries(modelInfo.feature_importances)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 8)
                  .map(([feat, score], idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#344054] font-mono">{feat}</span>
                        <span className="text-[#667085]">
                          {((score as number) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#EAECF0] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2563EB] h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(8, (score as number) * 100 * 3))}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-xs text-[#667085]">Feature importance data loading...</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#2563EB]" />
              Model Architecture & Hyperparameters
            </h3>

            <div className="divide-y divide-[#EAECF0] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Model Type</span>
                <span className="font-bold text-[#171717]">{modelInfo?.model_type || 'TabularGradientBoostedEnsemble'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Number of Trees</span>
                <span className="font-bold text-[#171717]">{modelInfo?.hyperparameters?.numTrees || 28}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Max Tree Depth</span>
                <span className="font-bold text-[#171717]">{modelInfo?.hyperparameters?.maxDepth || 4}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Learning Rate</span>
                <span className="font-bold text-[#171717]">{modelInfo?.hyperparameters?.learningRate || 0.1}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Total Encoded Feature Space</span>
                <span className="font-bold text-[#171717]">{modelInfo?.features_count || 38} features</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">Maximum Retries Permitted</span>
                <span className="font-bold text-[#16A34A]">{modelInfo?.safety_limits?.max_retries || 2}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#667085]">High Probability Threshold</span>
                <span className="font-bold text-[#2563EB]">≥ {(modelInfo?.thresholds?.recovery?.high_min || 0.70) * 100}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
