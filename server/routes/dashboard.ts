import { Router, Request, Response } from 'express';
import { memoryStore } from '../db/connection.js';

export const dashboardRouter = Router();

dashboardRouter.get('/kpis', (_req: Request, res: Response) => {
  const payments = Array.from(memoryStore.payments.values());
  const cases = Array.from(memoryStore.recoveryCases.values());

  let totalProcessedVolume = 0;
  let revenueAtRisk = 0;
  let recoveredRevenue = 0;
  let failedPaymentsCount = 0;
  let successfulPaymentsCount = 0;

  payments.forEach((p) => {
    totalProcessedVolume += p.amount;
    if (p.payment_status === 'SUCCESSFUL') {
      successfulPaymentsCount++;
    } else {
      failedPaymentsCount++;
      if (p.recovery_status === 'RECOVERED') {
        recoveredRevenue += p.recovered_amount || p.amount;
        revenueAtRisk += p.amount;
      } else if (p.recovery_status === 'AT_RISK' || p.recovery_status === 'RECOVERING') {
        revenueAtRisk += p.amount;
      }
    }
  });

  const activeRecoveryCases = cases.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
  const totalRecoverableBase = revenueAtRisk > 0 ? revenueAtRisk : 1;
  const recoveryRate = Number(((recoveredRevenue / totalRecoverableBase) * 100).toFixed(1));

  res.json({
    success: true,
    data: {
      totalProcessedVolume,
      revenueAtRisk,
      recoveredRevenue,
      recoveryRate,
      failedPaymentsCount,
      successfulPaymentsCount,
      activeRecoveryCases,
      totalCustomers: memoryStore.customers.size,
      currency: 'INR'
    }
  });
});

dashboardRouter.get('/trend', (_req: Request, res: Response) => {
  const payments = Array.from(memoryStore.payments.values());
  
  // Aggregate by day (last 14 days)
  const dayMap = new Map<string, { date: string; atRisk: number; recovered: number; totalVolume: number }>();
  
  // Sort payments chronologically
  const sorted = payments.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  sorted.forEach((p) => {
    const day = p.created_at.slice(0, 10);
    if (!dayMap.has(day)) {
      dayMap.set(day, { date: day, atRisk: 0, recovered: 0, totalVolume: 0 });
    }
    const bucket = dayMap.get(day)!;
    bucket.totalVolume += p.amount;
    if (p.payment_status !== 'SUCCESSFUL') {
      bucket.atRisk += p.amount;
      if (p.recovery_status === 'RECOVERED') {
        bucket.recovered += p.recovered_amount || p.amount;
      }
    }
  });

  // Get last 14 dates sorted
  const trend = Array.from(dayMap.values()).slice(-14);

  res.json({
    success: true,
    data: trend
  });
});

dashboardRouter.get('/failure-breakdown', (_req: Request, res: Response) => {
  const payments = Array.from(memoryStore.payments.values());
  const failures = payments.filter((p) => p.payment_status !== 'SUCCESSFUL');

  const categoryMap = new Map<string, { category: string; count: number; amount: number; recoveredAmount: number }>();

  failures.forEach((p) => {
    const cat = p.failure_category || 'OTHER';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { category: cat, count: 0, amount: 0, recoveredAmount: 0 });
    }
    const item = categoryMap.get(cat)!;
    item.count += 1;
    item.amount += p.amount;
    if (p.recovery_status === 'RECOVERED') {
      item.recoveredAmount += p.recovered_amount || p.amount;
    }
  });

  const breakdown = Array.from(categoryMap.values()).map((c) => ({
    ...c,
    recoveryRate: c.amount > 0 ? Number(((c.recoveredAmount / c.amount) * 100).toFixed(1)) : 0
  }));

  res.json({
    success: true,
    data: breakdown
  });
});

dashboardRouter.get('/interventions-breakdown', (_req: Request, res: Response) => {
  const cases = Array.from(memoryStore.recoveryCases.values());
  const recoveredCases = cases.filter((c) => c.status === 'RECOVERED');
  
  // Categorize into the 5 standard fintech recovery interventions
  // 1. Retry Payment (SMART_RETRY_OFFPEAK, DYNAMIC_RETRY)
  // 2. Payment Reminder (DUNNING_WHATSAPP, DUNNING_EMAIL)
  // 3. Payment Link (PAYMENT_LINK_SMS, ONE_CLICK_MANDATE_UPDATE)
  // 4. Alternate Method (METHOD_SWITCH_UPI)
  // 5. Human Escalation (MANUAL_INTERVENTION)
  
  const map: Record<string, { name: string; amount: number; count: number; color: string }> = {
    'Retry Payment': { name: 'Retry Payment', amount: 0, count: 0, color: '#2563EB' },
    'Payment Reminder': { name: 'Payment Reminder', amount: 0, count: 0, color: '#16A34A' },
    'Payment Link': { name: 'Payment Link', amount: 0, count: 0, color: '#9333EA' },
    'Alternate Method': { name: 'Alternate Method', amount: 0, count: 0, color: '#F97316' },
    'Human Escalation': { name: 'Human Escalation', amount: 0, count: 0, color: '#EF4444' }
  };

  recoveredCases.forEach((c) => {
    const strat = c.recommended_strategy || '';
    const amt = c.recovered_amount || c.at_risk_amount || 0;
    if (strat.includes('RETRY')) {
      map['Retry Payment'].amount += amt;
      map['Retry Payment'].count += 1;
    } else if (strat.includes('DUNNING') || strat.includes('REMINDER')) {
      map['Payment Reminder'].amount += amt;
      map['Payment Reminder'].count += 1;
    } else if (strat.includes('LINK') || strat.includes('MANDATE')) {
      map['Payment Link'].amount += amt;
      map['Payment Link'].count += 1;
    } else if (strat.includes('SWITCH') || strat.includes('UPI')) {
      map['Alternate Method'].amount += amt;
      map['Alternate Method'].count += 1;
    } else {
      map['Human Escalation'].amount += amt;
      map['Human Escalation'].count += 1;
    }
  });

  const totalRecovered = Object.values(map).reduce((sum, item) => sum + item.amount, 0) || 1;
  const items = Object.values(map).map((item) => ({
    ...item,
    percentage: Number(((item.amount / totalRecovered) * 100).toFixed(1))
  }));

  res.json({
    success: true,
    data: {
      totalRecovered,
      items
    }
  });
});

dashboardRouter.get('/recent-activity', (_req: Request, res: Response) => {
  const auditLogs = Array.from(memoryStore.auditLogs.slice(0, 15));
  const cases = Array.from(memoryStore.recoveryCases.values()).slice(0, 15);
  
  // Format high-level activity feed
  const activities = [
    {
      id: 'act_1',
      type: 'RECOVERED',
      title: '₹4,999 recovered',
      caseId: 'RC-10291',
      description: 'Auto-retry executed during customer pay cycle',
      timeAgo: '2 min ago',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString()
    },
    {
      id: 'act_2',
      type: 'ESCALATED',
      title: 'Case escalated to human',
      caseId: 'RC-10289',
      description: 'High LTV account with recurring gateway downtime',
      timeAgo: '15 min ago',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString()
    },
    {
      id: 'act_3',
      type: 'RETRY_INITIATED',
      title: 'Retry initiated',
      caseId: 'RC-10288',
      description: 'Off-peak intelligent debit scheduled',
      timeAgo: '22 min ago',
      timestamp: new Date(Date.now() - 22 * 60000).toISOString()
    },
    {
      id: 'act_4',
      type: 'REMINDER_SENT',
      title: 'Payment reminder sent',
      caseId: 'RC-10290',
      description: 'WhatsApp 1-click UPI pay link dispatched',
      timeAgo: '32 min ago',
      timestamp: new Date(Date.now() - 32 * 60000).toISOString()
    },
    {
      id: 'act_5',
      type: 'RECOVERED',
      title: '₹8,499 recovered',
      caseId: 'RC-10284',
      description: 'Mandate refreshed via dynamic email link',
      timeAgo: '45 min ago',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString()
    }
  ];

  res.json({
    success: true,
    data: activities
  });
});

