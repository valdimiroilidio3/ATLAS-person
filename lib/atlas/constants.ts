import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Brain,
  Bot,
  FolderGit2,
  Gauge,
  Home,
  Radar,
  Settings,
  Target,
} from 'lucide-react';
import type {
  ActivityKind,
  AgentStatus,
  ApprovalLevel,
  InsightType,
  MemoryCategory,
  OpportunityStatus,
  ProjectStatus,
  RunStepStatus,
  AgentRunStatus,
} from './types';

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral';

/** Permission architecture — spec §11 */
export const PERMISSION_LEVELS: {
  level: ApprovalLevel;
  name: string;
  short: string;
  description: string;
}[] = [
  { level: 0, name: 'Observe', short: 'L0', description: 'ATLAS watches and reports. It takes no action.' },
  { level: 1, name: 'Recommend', short: 'L1', description: 'ATLAS recommends. You decide.' },
  { level: 2, name: 'Prepare', short: 'L2', description: 'ATLAS prepares drafts and plans for your review.' },
  { level: 3, name: 'Execute', short: 'L3', description: 'ATLAS executes after your explicit approval.' },
  {
    level: 4,
    name: 'Autonomous',
    short: 'L4',
    description:
      'ATLAS executes without asking. Sending messages, spending money and deleting data always require explicit approval.',
  },
];

export function permissionLabel(level: ApprovalLevel): string {
  return PERMISSION_LEVELS.find((p) => p.level === level)?.name ?? 'Unknown';
}

export function permissionShort(level: ApprovalLevel): string {
  return PERMISSION_LEVELS.find((p) => p.level === level)?.short ?? 'L?';
}

// ---------------------------------------------------------------- Status meta

export const AGENT_STATUS_META: Record<AgentStatus, { label: string; tone: Tone }> = {
  idle: { label: 'IDLE', tone: 'neutral' },
  running: { label: 'RUNNING', tone: 'accent' },
  waiting: { label: 'WAITING', tone: 'warning' },
  blocked: { label: 'BLOCKED', tone: 'error' },
  completed: { label: 'COMPLETED', tone: 'success' },
  error: { label: 'ERROR', tone: 'error' },
};

export const RUN_STATUS_META: Record<AgentRunStatus, { label: string; tone: Tone }> = {
  thinking: { label: 'THINKING', tone: 'info' },
  preparing: { label: 'PREPARING', tone: 'info' },
  executing: { label: 'EXECUTING', tone: 'accent' },
  'waiting-approval': { label: 'WAITING FOR APPROVAL', tone: 'warning' },
  blocked: { label: 'BLOCKED', tone: 'error' },
  completed: { label: 'COMPLETED', tone: 'success' },
  cancelled: { label: 'CANCELLED', tone: 'neutral' },
  error: { label: 'ERROR', tone: 'error' },
};

export const STEP_STATUS_META: Record<RunStepStatus, { label: string; tone: Tone }> = {
  pending: { label: 'PENDING', tone: 'neutral' },
  running: { label: 'RUNNING', tone: 'accent' },
  done: { label: 'DONE', tone: 'success' },
  blocked: { label: 'BLOCKED', tone: 'error' },
};

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; tone: Tone }> = {
  active: { label: 'ACTIVE', tone: 'accent' },
  blocked: { label: 'BLOCKED', tone: 'error' },
  paused: { label: 'PAUSED', tone: 'warning' },
  completed: { label: 'COMPLETED', tone: 'success' },
};

export const INSIGHT_META: Record<InsightType, { label: string; tone: Tone }> = {
  opportunity: { label: 'OPPORTUNITY', tone: 'success' },
  risk: { label: 'RISK', tone: 'warning' },
  signal: { label: 'SIGNAL', tone: 'info' },
  trend: { label: 'TREND', tone: 'info' },
  blocker: { label: 'BLOCKER', tone: 'error' },
};

export const MEMORY_CATEGORIES: { id: MemoryCategory; label: string; description: string }[] = [
  { id: 'goals', label: 'GOALS', description: 'What you are optimizing for.' },
  { id: 'projects', label: 'PROJECTS', description: 'What is being built.' },
  { id: 'preferences', label: 'PREFERENCES', description: 'How you like to work.' },
  { id: 'skills', label: 'SKILLS', description: 'What you are excellent at.' },
  { id: 'decisions', label: 'DECISIONS', description: 'What you have decided — and why.' },
  { id: 'context', label: 'IMPORTANT CONTEXT', description: 'Facts ATLAS should never lose.' },
];

export const OPPORTUNITY_STATUS_META: Record<OpportunityStatus, { label: string; tone: Tone }> = {
  new: { label: 'NEW', tone: 'accent' },
  contacted: { label: 'CONTACTED', tone: 'info' },
  replied: { label: 'REPLIED', tone: 'success' },
  qualified: { label: 'QUALIFIED', tone: 'success' },
};

export const ACTIVITY_KIND_META: Record<ActivityKind, { label: string; tone: Tone }> = {
  agent: { label: 'AGENT', tone: 'info' },
  system: { label: 'ATLAS', tone: 'accent' },
  user: { label: 'YOU', tone: 'neutral' },
  approval: { label: 'APPROVAL', tone: 'warning' },
};

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/execution', label: 'Execution', icon: Gauge },
  { href: '/radar', label: 'Radar', icon: Radar },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
];
