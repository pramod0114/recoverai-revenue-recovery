import { AgentAuditEntry, WorkflowState } from './types.js';
import { memoryStore } from '../db/connection.js';

export class AuditService {
  private static instance: AuditService;
  private agentAuditLogs: AgentAuditEntry[] = [];

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Record a detailed audit log entry
   */
  public log(entry: Omit<AgentAuditEntry, 'id' | 'timestamp'> & { timestamp?: string }): AgentAuditEntry {
    const record: AgentAuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      case_id: entry.case_id,
      transaction_id: entry.transaction_id,
      agent: entry.agent,
      event: entry.event,
      decision: entry.decision,
      action: entry.action,
      previous_state: entry.previous_state,
      new_state: entry.new_state,
      reason: entry.reason,
      result: entry.result,
      model_version: entry.model_version || 'recovery-model-v1'
    };

    this.agentAuditLogs.unshift(record);

    // Also mirror to global database memoryStore auditLogs for cross-system visibility
    memoryStore.auditLogs.unshift({
      id: record.id,
      actor_type: 'SYSTEM_AI_AGENT',
      actor_id: entry.agent,
      action_name: `${entry.event}:${entry.action || entry.decision || 'TRANSITION'}`,
      entity_type: 'RECOVERY_CASE',
      entity_id: entry.case_id,
      previous_state: { state: entry.previous_state },
      new_state: { state: entry.new_state, result: entry.result, reason: entry.reason },
      ip_address: '127.0.0.1 (AGENT_INTERNAL)',
      user_agent: 'RecoverAI-Core-Agent/2.0',
      created_at: record.timestamp
    });

    return record;
  }

  /**
   * Get audit history for a specific case
   */
  public getCaseAuditTrail(caseId: string): AgentAuditEntry[] {
    return this.agentAuditLogs.filter((log) => log.case_id === caseId);
  }

  /**
   * Get all agent audit logs
   */
  public getAllLogs(limit: number = 100): AgentAuditEntry[] {
    return this.agentAuditLogs.slice(0, limit);
  }

  /**
   * Clear in-memory logs (for test isolation)
   */
  public clear(): void {
    this.agentAuditLogs = [];
  }
}
