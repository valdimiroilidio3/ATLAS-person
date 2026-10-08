// ATLAS data model — spec §17
// User · Goal · Project · Task · Agent · AgentRun · Memory · Insight
// Opportunity · Approval · Integration · Activity · Metric · Milestone · Strategy

import type { LucideIcon } from 'lucide-react';

export type ID = string;
export type Currency = 'EUR' | 'USD' | 'GBP';

/** Permission architecture — spec §11 */
export type ApprovalLevel = 0 | 1 | 2 | 3 | 4;

// ---------------------------------------------------------------- User

export interface UserProfile {
  id: ID;
  name: string;
  email: string;
  timezone: string;
  currency: Currency;
  role: string;
}

export interface Preferences {
  /** Default permission level granted to agents. */
  defaultPermissionLevel: ApprovalLevel;
  briefingEnabled: boolean;
  briefingTime: string; // "08:00"
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  currency: Currency;
}

// ---------------------------------------------------------------- Goals

export type GoalUnit = 'currency' | 'percent' | 'count';
export type GoalStatus = 'on-track' | 'at-risk' | 'behind' | 'completed';

export interface Goal {
  id: ID;
  title: string;
  objective: string;
  unit: GoalUnit;
  target: number;
  current: number;
  /** Estimated end-of-horizon value, derived from the user's assumptions. */
  projected?: number;
  currency?: Currency;
  deadline: string; // ISO date
  status: GoalStatus;
  strategy: string[];
  assumptions: string[];
  milestones: Milestone[];
  risks: string[];
  nextActions: string[];
  aiRecommendation: string;
  linkedProjectId?: ID;
  createdAt: string;
  updatedAt: string;
}

export type MilestoneStatus = 'done' | 'active' | 'todo';

export interface Milestone {
  id: ID;
  title: string;
  status: MilestoneStatus;
  dueDate?: string;
}

// ---------------------------------------------------------------- Projects

export type ProjectStatus = 'active' | 'blocked' | 'paused' | 'completed';

export interface Blocker {
  id: ID;
  title: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  integrationId?: ID;
}

export interface Project {
  id: ID;
  name: string;
  objective: string;
  status: ProjectStatus;
  deadline?: string;
  milestones: Milestone[];
  blockers: Blocker[];
  agentIds: ID[];
  nextAction: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------- Agents

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'blocked' | 'completed' | 'error';

export interface AgentActivity {
  id: ID;
  time: string;
  title: string;
  detail?: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

export interface Agent {
  id: ID;
  name: string;
  purpose: string;
  status: AgentStatus;
  currentTask: string;
  progress: number;
  tools: string[];
  permissionLevel: ApprovalLevel;
  approvalRequired: boolean;
  results: string[];
  errors: string[];
  activity: AgentActivity[];
  lastRunAt?: string;
}

// ---------------------------------------------------------------- Runs (execution)

export type RunStepStatus = 'pending' | 'running' | 'done' | 'blocked';

export interface RunStepEffect {
  type: 'complete-milestone';
  projectId: ID;
  milestoneTitle: string;
}

export interface RunStep {
  id: ID;
  title: string;
  detail?: string;
  status: RunStepStatus;
  /** Pause before this step until the user approves. */
  requiresApproval?: boolean;
  approvalLevel?: ApprovalLevel;
  approvalId?: ID;
  /** Step cannot run until this integration is connected. */
  integrationId?: ID;
  altIntegrationIds?: ID[];
  /** Step touches the outside world (needs a connected channel). */
  external?: boolean;
  blockedReason?: string;
  /** Simulation ticks the step stays in `running`. */
  ticks: number;
  ticksLeft: number;
  effect?: RunStepEffect;
}

export type AgentRunStatus =
  | 'thinking'
  | 'preparing'
  | 'executing'
  | 'waiting-approval'
  | 'blocked'
  | 'completed'
  | 'cancelled'
  | 'error';

export type RunKind =
  | 'outreach'
  | 'send-approved'
  | 'deploy'
  | 'catalog'
  | 'seo-audit'
  | 'scout-sweep'
  | 'research'
  | 'content'
  | 'generic';

export interface AgentRun {
  id: ID;
  agentId: ID;
  objective: string;
  kind: RunKind;
  status: AgentRunStatus;
  steps: RunStep[];
  currentStepIndex: number;
  progress: number; // 0..100
  startedAt: string;
  finishedAt?: string;
  result?: string;
  error?: string;
  createdBy: 'user' | 'atlas';
  linkedGoalId?: ID;
  linkedProjectId?: ID;
  linkedOpportunityIds?: ID[];
  approvalIds: ID[];
}

// ---------------------------------------------------------------- Approvals

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed';

export type ApprovalEffect =
  | { type: 'memory'; category: MemoryCategory; text: string }
  | { type: 'spawn-run'; agentId: ID; objective: string; kind: RunKind }
  | { type: 'none' };

export interface Approval {
  id: ID;
  level: ApprovalLevel;
  action: string;
  description: string;
  context: { agent: string; detail?: string };
  status: ApprovalStatus;
  runId?: ID;
  effect?: ApprovalEffect;
  createdAt: string;
  resolvedAt?: string;
}

// ---------------------------------------------------------------- Activity

export type ActivityKind = 'agent' | 'system' | 'user' | 'approval';

export interface ActivityEvent {
  id: ID;
  time: string;
  kind: ActivityKind;
  actor: string;
  title: string;
  detail?: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
}

// ---------------------------------------------------------------- Radar / insights

export type InsightType = 'opportunity' | 'risk' | 'signal' | 'trend' | 'blocker';

export interface Insight {
  id: ID;
  type: InsightType;
  title: string;
  description: string;
  whyItMatters: string;
  recommendation: string;
  actionLabel?: string;
  actionKind?: 'execute-nba' | 'connect' | 'view-project' | 'open-execution';
  integrationId?: ID;
  projectId?: ID;
  severity: 'high' | 'medium' | 'low';
  createdAt: string;
}

// ---------------------------------------------------------------- Opportunities

export type OpportunityStatus = 'new' | 'contacted' | 'replied' | 'qualified';

export interface Opportunity {
  id: ID;
  company: string;
  person: string;
  role: string;
  matchScore: number;
  signals: string[];
  status: OpportunityStatus;
  source: string;
  createdAt: string;
  contactedAt?: string;
  /** Messages drafted + approved, waiting for a connected channel. */
  outreachApproved?: boolean;
}

// ---------------------------------------------------------------- Memory

export type MemoryCategory = 'goals' | 'projects' | 'preferences' | 'skills' | 'decisions' | 'context';

export interface MemoryEntry {
  id: ID;
  category: MemoryCategory;
  key: string;
  value: string;
  updatedAt: string;
}

// ---------------------------------------------------------------- Integrations

export interface Integration {
  id: ID;
  name: string;
  provider: string;
  description: string;
  icon: LucideIcon;
  connected: boolean;
  connectedAt?: string;
  scopes: string[];
  adapterStatus: 'ready' | 'beta';
}

// ---------------------------------------------------------------- Toasts

export interface Toast {
  id: ID;
  title: string;
  body?: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  /** Errors and approval requests stay until dismissed. */
  persistent?: boolean;
}

// ---------------------------------------------------------------- State

export interface AtlasState {
  user: UserProfile;
  preferences: Preferences;
  goals: Goal[];
  projects: Project[];
  agents: Agent[];
  runs: AgentRun[];
  approvals: Approval[];
  activities: ActivityEvent[];
  insights: Insight[];
  opportunities: Opportunity[];
  memories: MemoryEntry[];
  integrations: Integration[];
  toasts: Toast[];
  hydrated: boolean;
}
