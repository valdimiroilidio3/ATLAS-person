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
  Shield,
  Target,
} from 'lucide-react';
import { t } from '@/lib/i18n';
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
  nameKey: string;
  short: string;
  descriptionKey: string;
}[] = [
  { level: 0, nameKey: 'Observe', short: 'L0', descriptionKey: 'ATLAS watches and reports. It takes no action.' },
  { level: 1, nameKey: 'Recommend', short: 'L1', descriptionKey: 'ATLAS recommends. You decide.' },
  { level: 2, nameKey: 'Prepare', short: 'L2', descriptionKey: 'ATLAS prepares drafts and plans for your review.' },
  { level: 3, nameKey: 'Execute', short: 'L3', descriptionKey: 'ATLAS executes after your explicit approval.' },
  {
    level: 4,
    nameKey: 'Autonomous',
    short: 'L4',
    descriptionKey:
      'ATLAS executes without asking. Sending messages, spending money and deleting data always require explicit approval.',
  },
];

export function permissionLabel(level: ApprovalLevel): string {
  const found = PERMISSION_LEVELS.find((p) => p.level === level);
  return found ? t(found.nameKey) : t('Unknown');
}

export function permissionShort(level: ApprovalLevel): string {
  return PERMISSION_LEVELS.find((p) => p.level === level)?.short ?? 'L?';
}

// ---------------------------------------------------------------- Status meta
// Labels are dictionary keys — components render them with t(meta.labelKey).

export const AGENT_STATUS_META: Record<AgentStatus, { labelKey: string; tone: Tone }> = {
  idle: { labelKey: 'IDLE', tone: 'neutral' },
  running: { labelKey: 'RUNNING', tone: 'accent' },
  waiting: { labelKey: 'WAITING', tone: 'warning' },
  blocked: { labelKey: 'BLOCKED', tone: 'error' },
  completed: { labelKey: 'COMPLETED', tone: 'success' },
  error: { labelKey: 'ERROR', tone: 'error' },
};

export const RUN_STATUS_META: Record<AgentRunStatus, { labelKey: string; tone: Tone }> = {
  thinking: { labelKey: 'THINKING', tone: 'info' },
  preparing: { labelKey: 'PREPARING', tone: 'info' },
  executing: { labelKey: 'EXECUTING', tone: 'accent' },
  'waiting-approval': { labelKey: 'WAITING FOR APPROVAL', tone: 'warning' },
  blocked: { labelKey: 'BLOCKED', tone: 'error' },
  completed: { labelKey: 'COMPLETED', tone: 'success' },
  cancelled: { labelKey: 'CANCELLED', tone: 'neutral' },
  error: { labelKey: 'ERROR', tone: 'error' },
};

export const STEP_STATUS_META: Record<RunStepStatus, { labelKey: string; tone: Tone }> = {
  pending: { labelKey: 'PENDING', tone: 'neutral' },
  running: { labelKey: 'RUNNING', tone: 'accent' },
  done: { labelKey: 'DONE', tone: 'success' },
  blocked: { labelKey: 'BLOCKED', tone: 'error' },
};

export const PROJECT_STATUS_META: Record<ProjectStatus, { labelKey: string; tone: Tone }> = {
  active: { labelKey: 'ACTIVE', tone: 'accent' },
  blocked: { labelKey: 'BLOCKED', tone: 'error' },
  paused: { labelKey: 'PAUSED', tone: 'warning' },
  completed: { labelKey: 'COMPLETED', tone: 'success' },
};

export const INSIGHT_META: Record<InsightType, { labelKey: string; tone: Tone }> = {
  opportunity: { labelKey: 'OPPORTUNITY', tone: 'success' },
  risk: { labelKey: 'RISK', tone: 'warning' },
  signal: { labelKey: 'SIGNAL', tone: 'info' },
  trend: { labelKey: 'TREND', tone: 'info' },
  blocker: { labelKey: 'BLOCKER', tone: 'error' },
};

export const MEMORY_CATEGORIES: { id: MemoryCategory; labelKey: string; descriptionKey: string }[] = [
  { id: 'goals', labelKey: 'GOALS', descriptionKey: 'What you are optimizing for.' },
  { id: 'projects', labelKey: 'PROJECTS', descriptionKey: 'What is being built.' },
  { id: 'preferences', labelKey: 'PREFERENCES', descriptionKey: 'How you like to work.' },
  { id: 'skills', labelKey: 'SKILLS', descriptionKey: 'What you are excellent at.' },
  { id: 'decisions', labelKey: 'DECISIONS', descriptionKey: 'What you have decided — and why.' },
  { id: 'context', labelKey: 'IMPORTANT CONTEXT', descriptionKey: 'Facts ATLAS should never lose.' },
];

export const OPPORTUNITY_STATUS_META: Record<OpportunityStatus, { labelKey: string; tone: Tone }> = {
  new: { labelKey: 'NEW', tone: 'accent' },
  contacted: { labelKey: 'CONTACTED', tone: 'info' },
  replied: { labelKey: 'REPLIED', tone: 'success' },
  qualified: { labelKey: 'QUALIFIED', tone: 'success' },
};

export const ACTIVITY_KIND_META: Record<ActivityKind, { labelKey: string; tone: Tone }> = {
  agent: { labelKey: 'AGENT', tone: 'info' },
  system: { labelKey: 'ATLAS', tone: 'accent' },
  user: { labelKey: 'YOU', tone: 'neutral' },
  approval: { labelKey: 'APPROVAL', tone: 'warning' },
};

export const NAV_ITEMS: { href: string; labelKey: string; icon: LucideIcon }[] = [
  { href: '/', labelKey: 'Home', icon: Home },
  { href: '/goals', labelKey: 'Goals', icon: Target },
  { href: '/projects', labelKey: 'Projects', icon: FolderGit2 },
  { href: '/agents', labelKey: 'Agents', icon: Bot },
  { href: '/execution', labelKey: 'Execution', icon: Gauge },
  { href: '/radar', labelKey: 'Radar', icon: Radar },
  { href: '/activity', labelKey: 'Activity', icon: Activity },
  { href: '/memory', labelKey: 'Memory', icon: Brain },
  { href: '/settings', labelKey: 'Settings', icon: Settings },
  { href: '/admin', labelKey: 'Admin', icon: Shield },
];
