// ATLAS engine — intent interpretation, next-best-action derivation,
// execution planning and the agent-run state machine.
//
// Everything here is a pure function over AtlasState so the store can
// drive it with timers and the UI can drive it with user actions.

import { formatCurrency, formatDateLong } from './format';
import { permissionShort } from './constants';
import type {
  ActivityEvent,
  AgentRun,
  AgentRunStatus,
  Approval,
  ApprovalLevel,
  AtlasState,
  Goal,
  ID,
  Milestone,
  Opportunity,
  Project,
  RunKind,
  RunStep,
  Toast,
} from './types';

// ---------------------------------------------------------------- ids

let uidSeq = 0;
export function uid(prefix = 'id'): ID {
  uidSeq += 1;
  return `${prefix}-${Date.now().toString(36).slice(-5)}${uidSeq.toString(36)}`;
}

// ---------------------------------------------------------------- derivations

/** Project progress is derived from structured milestone state — never random. */
export function deriveProjectProgress(project: Project): number {
  const ms = project.milestones;
  if (!ms.length) return project.status === 'completed' ? 100 : 0;
  const done = ms.filter((m) => m.status === 'done').length;
  return Math.round((done / ms.length) * 100);
}

export function goalProgress(goal: Goal): number {
  if (goal.target <= 0) return 0;
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}

export function summarizeActivity(state: AtlasState) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayEvents = state.activities.filter((a) => new Date(a.time) >= startOfToday);
  return {
    completedToday: todayEvents.filter((a) => a.tone === 'success').length,
    awaitingApproval: state.approvals.filter((a) => a.status === 'pending').length,
    blocked:
      state.runs.filter((r) => r.status === 'blocked').length +
      state.agents.filter((a) => a.status === 'blocked').length,
  };
}

// ---------------------------------------------------------------- steps

export function makeStep(partial: Partial<RunStep> & { title: string }): RunStep {
  return {
    id: uid('step'),
    status: 'pending',
    ticks: 1,
    ticksLeft: 0,
    ...partial,
  };
}

function sendStep(title: string, detail: string): RunStep {
  return makeStep({
    title,
    detail,
    integrationId: 'gmail',
    altIntegrationIds: ['whatsapp'],
    blockedReason: 'No connected channel. Connect Gmail or WhatsApp to send messages.',
    ticks: 1,
  });
}

function outreachPlan(count: number): RunStep[] {
  return [
    makeStep({
      title: 'Qualify prospects against your ICP',
      detail: 'Scoring model v2 · threshold 75',
      ticks: 1,
    }),
    makeStep({
      title: 'Draft personalized messages',
      detail: `${count} messages · direct tone · your voice`,
      ticks: 2,
    }),
    makeStep({
      title: 'Review and approve messages',
      detail: 'Nothing is sent without your approval',
      requiresApproval: true,
      approvalLevel: 3,
      ticks: 1,
    }),
    sendStep('Send messages', 'Via Gmail or WhatsApp'),
    makeStep({
      title: 'Log results to SCOUT',
      detail: 'Activity, radar and follow-up queue',
      ticks: 1,
    }),
  ];
}

export function sendApprovedPlan(count: number): RunStep[] {
  return [
    makeStep({
      title: 'Confirm approved messages',
      detail: `${count} messages approved by you`,
      ticks: 1,
    }),
    sendStep('Send messages', 'Via Gmail or WhatsApp'),
    makeStep({ title: 'Log results to SCOUT', ticks: 1 }),
  ];
}

export function deployPlan(project: Project): RunStep[] {
  return [
    makeStep({
      title: 'Diagnose deployment configuration',
      detail: 'Found missing: DATABASE_URL, STRIPE_KEY',
      ticks: 1,
    }),
    makeStep({
      title: 'Configure environment variables',
      detail: 'Requires a Vercel connection',
      integrationId: 'vercel',
      blockedReason: 'Vercel is not connected. Add the integration to configure environment variables.',
      ticks: 1,
    }),
    makeStep({ title: 'Deploy to production', ticks: 1 }),
    makeStep({ title: 'Verify live site', detail: 'Smoke-test key pages', ticks: 1 }),
  ];
}

export function catalogPlan(project: Project): RunStep[] {
  const active = project.milestones.find((m) => m.status === 'active');
  return [
    makeStep({
      title: `Generate missing copy — ${active?.title ?? 'final item'}`,
      detail: 'Product copy, bundle contents and FAQs',
      ticks: 2,
    }),
    makeStep({
      title: 'Review catalog changes',
      detail: 'You approve before anything is applied',
      requiresApproval: true,
      approvalLevel: 3,
      ticks: 1,
    }),
    makeStep({
      title: 'Apply changes to the catalog',
      detail: 'Updates the project state in ATLAS',
      ticks: 1,
      effect: active
        ? { type: 'complete-milestone', projectId: project.id, milestoneTitle: active.title }
        : undefined,
    }),
  ];
}

function seoAuditPlan(project: Project): RunStep[] {
  return [
    makeStep({ title: `Crawl ${project.name}`, detail: 'Full technical crawl', ticks: 1 }),
    makeStep({ title: 'Analyze known issues', detail: '18 issues triaged by severity', ticks: 2 }),
    makeStep({ title: 'Generate fix list', detail: 'Prioritized by traffic impact', ticks: 1 }),
    makeStep({
      title: 'Apply safe fixes',
      detail: 'Meta descriptions, alt text, sitemap',
      requiresApproval: true,
      approvalLevel: 2,
      ticks: 1,
      effect: { type: 'complete-milestone', projectId: project.id, milestoneTitle: 'SEO audit' },
    }),
  ];
}

function scoutSweepPlan(): RunStep[] {
  return [
    makeStep({ title: 'Scan configured sources', detail: 'LinkedIn, web, job boards', ticks: 1 }),
    makeStep({ title: 'Score against ICP', detail: 'Scoring model v2', ticks: 2 }),
    makeStep({ title: 'Queue top prospects', detail: 'Threshold 75', ticks: 1 }),
    makeStep({ title: 'Update radar', detail: 'Signals and trends', ticks: 1 }),
  ];
}

function researchPlan(objective: string): RunStep[] {
  return [
    makeStep({ title: 'Define research scope', detail: objective, ticks: 1 }),
    makeStep({ title: 'Gather sources', ticks: 2 }),
    makeStep({ title: 'Synthesize findings', ticks: 2 }),
    makeStep({ title: 'Deliver report', ticks: 1 }),
  ];
}

function contentPlan(objective: string): RunStep[] {
  return [
    makeStep({ title: 'Draft asset', detail: objective, ticks: 2 }),
    makeStep({
      title: 'Review draft',
      detail: 'Nothing is published without your approval',
      requiresApproval: true,
      approvalLevel: 3,
      ticks: 1,
    }),
    makeStep({
      title: 'Publish',
      detail: 'Deliver via a connected channel',
      external: true,
      blockedReason: 'No publishing channel is connected. The approved draft is saved in ATLAS.',
      ticks: 1,
    }),
  ];
}

function executionPlan(objective: string): RunStep[] {
  return [
    makeStep({ title: 'Diagnose current state', detail: objective, ticks: 1 }),
    makeStep({
      title: 'Prepare execution plan',
      detail: 'Steps, dependencies and risks',
      requiresApproval: true,
      approvalLevel: 3,
      ticks: 1,
    }),
    makeStep({
      title: 'Execute',
      detail: 'External actions need a connected integration',
      external: true,
      blockedReason: 'No connected integration can perform this action yet.',
      ticks: 2,
    }),
    makeStep({ title: 'Verify outcome', ticks: 1 }),
  ];
}

function deploymentPlan(projectName: string): RunStep[] {
  return [
    makeStep({ title: 'Build project', ticks: 1 }),
    makeStep({
      title: 'Configure environment',
      detail: 'Requires a Vercel connection',
      integrationId: 'vercel',
      blockedReason: 'Vercel is not connected. Add the integration to configure environment variables.',
      ticks: 1,
    }),
    makeStep({ title: 'Deploy to production', ticks: 1 }),
    makeStep({ title: 'Verify live site', ticks: 1 }),
  ];
}

/** Generic plan when a user asks an agent to do something open-ended. */
export function agentPlan(agentId: ID, objective: string, state: AtlasState): RunStep[] {
  switch (agentId) {
    case 'a-scout':
      return scoutSweepPlan();
    case 'a-research':
      return researchPlan(objective);
    case 'a-content':
      return contentPlan(objective);
    case 'a-seo': {
      const orbita = state.projects.find((p) => p.id === 'p-orbita');
      return orbita ? seoAuditPlan(orbita) : researchPlan(objective);
    }
    case 'a-execution':
      return executionPlan(objective);
    case 'a-deployment': {
      const orbita = state.projects.find((p) => p.id === 'p-orbita');
      return orbita ? deploymentPlan(orbita.name) : executionPlan(objective);
    }
    default:
      return researchPlan(objective);
  }
}

// ---------------------------------------------------------------- next best action

export interface NextBestAction {
  id: string;
  kind: RunKind;
  priority: 1 | 2 | 3;
  agentId: ID;
  title: string;
  reasoning: string[];
  intentText: string;
  plan: {
    agentId: ID;
    objective: string;
    kind: RunKind;
    steps: RunStep[];
    linkedProjectId?: ID;
    linkedOpportunityIds?: ID[];
  };
}

export function deriveNextBestAction(state: AtlasState): NextBestAction | null {
  const orbita = state.projects.find((p) => p.id === 'p-orbita');
  const weaf = state.projects.find((p) => p.id === 'p-weaf');

  const approved = state.opportunities.filter((o) => o.outreachApproved && o.status === 'new');
  if (approved.length > 0) {
    return {
      id: 'send-approved',
      kind: 'send-approved',
      priority: 1,
      agentId: 'a-scout',
      title: `Send ${approved.length} approved messages.`,
      reasoning: [
        'Messages are drafted and approved by you.',
        'Waiting on a connected channel — Gmail or WhatsApp.',
        'Every send is logged and measured.',
      ],
      intentText: 'Send the approved outreach messages.',
      plan: {
        agentId: 'a-scout',
        objective: `Send ${approved.length} approved messages`,
        kind: 'send-approved',
        steps: sendApprovedPlan(approved.length),
        linkedOpportunityIds: approved.map((o) => o.id),
      },
    };
  }

  const fresh = state.opportunities.filter((o) => o.status === 'new' && !o.outreachApproved);
  if (fresh.length > 0) {
    const icp = fresh.filter((o) => o.signals.some((s) => /ideal customer/i.test(s))).length;
    const engaged = fresh.filter((o) => o.signals.some((s) => /portfolio|pricing/i.test(s))).length;
    const outdated = fresh.filter((o) => o.signals.some((s) => /outdated|opportunity/i.test(s))).length;
    const reasoning = [
      icp > 0 ? `${icp} match your ideal customer profile.` : null,
      engaged > 0 ? `${engaged} recently interacted with your site.` : null,
      outdated > 0 ? `${outdated} have a clear website opportunity.` : null,
      'SCOUT scored them against your ICP — threshold 75.',
    ].filter(Boolean) as string[];
    return {
      id: 'outreach',
      kind: 'outreach',
      priority: 1,
      agentId: 'a-scout',
      title: `Contact ${fresh.length} high-intent leads.`,
      reasoning,
      intentText: `Contact ${fresh.length} high-intent leads.`,
      plan: {
        agentId: 'a-scout',
        objective: `Contact ${fresh.length} high-intent leads`,
        kind: 'outreach',
        steps: outreachPlan(fresh.length),
        linkedOpportunityIds: fresh.map((o) => o.id),
      },
    };
  }

  if (orbita && orbita.status === 'blocked') {
    return {
      id: 'deploy',
      kind: 'deploy',
      priority: 1,
      agentId: 'a-execution',
      title: 'Resolve the ORBITA deployment blocker.',
      reasoning: [
        'Your launch date is in 6 days.',
        'Deployment is blocked: environment variables are missing.',
        'Vercel must be connected to configure them.',
      ],
      intentText: 'Prepare ORBITA for launch.',
      plan: {
        agentId: 'a-execution',
        objective: 'Resolve the ORBITA deployment blocker',
        kind: 'deploy',
        steps: deployPlan(orbita),
        linkedProjectId: orbita.id,
      },
    };
  }

  if (weaf) {
    const active = weaf.milestones.find((m) => m.status === 'active');
    if (active) {
      return {
        id: 'catalog',
        kind: 'catalog',
        priority: 2,
        agentId: 'a-content',
        title: `Complete WEAF — ${active.title.toLowerCase()}.`,
        reasoning: [
          `WEAF is at ${deriveProjectProgress(weaf)}%.`,
          'One catalog item remains.',
          'The CONTENT agent can draft it now.',
        ],
        intentText: 'Complete the WEAF catalog.',
        plan: {
          agentId: 'a-content',
          objective: 'Complete the WEAF catalog',
          kind: 'catalog',
          steps: catalogPlan(weaf),
          linkedProjectId: weaf.id,
        },
      };
    }
  }

  if (orbita) {
    const active = orbita.milestones.find((m) => m.status === 'active');
    if (active) {
      return {
        id: 'seo',
        kind: 'seo-audit',
        priority: 2,
        agentId: 'a-seo',
        title: 'Finish the ORBITA SEO audit.',
        reasoning: [
          '18 issues found so far.',
          'Safe fixes can be applied automatically.',
          'The launch checklist depends on it.',
        ],
        intentText: 'Finish the ORBITA SEO audit.',
        plan: {
          agentId: 'a-seo',
          objective: 'Finish the ORBITA SEO audit',
          kind: 'seo-audit',
          steps: seoAuditPlan(orbita),
          linkedProjectId: orbita.id,
        },
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------- intent interpreter

export type IntentType =
  | 'launch-project'
  | 'daily-briefing'
  | 'explain-status'
  | 'find-opportunities'
  | 'build-strategy'
  | 'prepare-launch'
  | 'analyze-projects'
  | 'create-goal'
  | 'run-agent'
  | 'start-nba'
  | 'unknown';

export interface GoalPreview {
  title: string;
  deadline?: string;
  strategy: string[];
  actions: string[];
  dependencies: string[];
  risks: string[];
  requiredApproval: ApprovalLevel;
  /** Ordered checklist with live statuses (launch readiness). */
  checklist?: { title: string; status: 'done' | 'active' | 'todo' }[];
}

export interface InterpretedIntent {
  type: IntentType;
  confidence: number;
  summary: string;
  answer?: string;
  goalPreview?: GoalPreview;
  plan?: {
    agentId: ID;
    objective: string;
    kind: RunKind;
    steps: RunStep[];
    linkedProjectId?: ID;
  };
  agentId?: ID;
  briefing?: { priorities: string[]; avoid: string; opportunity: string };
  suggestedChips: string[];
}

const AGENT_NAME_TO_ID: Record<string, ID> = {
  scout: 'a-scout',
  research: 'a-research',
  content: 'a-content',
  seo: 'a-seo',
  execution: 'a-execution',
  deployment: 'a-deployment',
};

function buildBriefing(state: AtlasState, nba: NextBestAction | null) {
  const orbita = state.projects.find((p) => p.id === 'p-orbita');
  const weaf = state.projects.find((p) => p.id === 'p-weaf');
  const fresh = state.opportunities.filter((o) => o.status === 'new' && !o.outreachApproved);
  const icp = fresh.filter((o) => o.signals.some((s) => /ideal customer/i.test(s))).length;
  return {
    priorities: [
      nba ? nba.title : 'Review your goals.',
      orbita?.status === 'blocked' ? 'Resolve the ORBITA deployment blocker.' : 'Finish the ORBITA SEO audit.',
      weaf?.milestones.some((m) => m.status === 'active') ? 'Complete the WEAF catalog.' : 'Review pending approvals.',
    ],
    avoid: 'Spending time polishing the UI before launch.',
    opportunity: icp > 0 ? `${icp} new prospects match your ideal customer profile.` : 'Your pipeline is quiet — ask SCOUT to find more prospects.',
  };
}

function explainStatus(state: AtlasState): string {
  const revenue = state.goals.find((g) => g.id === 'g-revenue');
  const orbita = state.projects.find((p) => p.id === 'p-orbita');
  const lines: string[] = [];
  if (revenue) {
    const projected = revenue.projected ?? revenue.current;
    lines.push(
      `Revenue is at ${formatCurrency(revenue.current)} of ${formatCurrency(revenue.target)} (${goalProgress(revenue)}%). At your current pace you project ${formatCurrency(projected)} — ${formatCurrency(Math.max(0, revenue.target - projected))} short.`,
    );
  }
  if (orbita) {
    lines.push(
      orbita.status === 'blocked'
        ? `ORBITA is at ${deriveProjectProgress(orbita)}% but blocked: ${orbita.blockers[0]?.reason ?? 'a blocker needs attention.'} The launch checklist cannot finish until deployment unblocks.`
        : `ORBITA is at ${deriveProjectProgress(orbita)}% and on track.`,
    );
  }
  const fresh = state.opportunities.filter((o) => o.status === 'new');
  lines.push(
    fresh.length > 0
      ? `SCOUT has ${fresh.length} high-intent prospects waiting — that is your fastest lever today.`
      : 'Your prospect queue is empty — a SCOUT sweep would refill it.',
  );
  return lines.join(' ');
}

function analyzeProjects(state: AtlasState): string {
  return state.projects
    .map((p) => {
      const progress = deriveProjectProgress(p);
      const blocker = p.blockers[0];
      const tail = blocker ? ` Blocked: ${blocker.title.toLowerCase()}.` : p.milestones.some((m) => m.status === 'active') ? ' On track.' : '';
      return `${p.name} — ${progress}%${tail}`;
    })
    .join(' ');
}

export function interpretIntent(input: string, state: AtlasState): InterpretedIntent {
  const q = input.toLowerCase().trim();
  const nba = deriveNextBestAction(state);
  const orbita = state.projects.find((p) => p.id === 'p-orbita');
  const scout = state.agents.find((a) => a.id === 'a-scout');
  const fresh = state.opportunities.filter((o) => o.status === 'new' && !o.outreachApproved);

  const baseChips = [
    'What should I do today?',
    'Launch my website.',
    'Why am I behind?',
    'Find opportunities.',
    'Build a strategy to reach €2,000/month.',
  ];

  // Launch my website / ORBITA
  if (/(launch|ship|deploy|go live)/.test(q) && /(website|orbita|site|portfolio)/.test(q)) {
    const deadline = new Date(Date.now() + 6 * 86400000).toISOString();
    return {
      type: 'launch-project',
      confidence: 0.9,
      summary: 'ATLAS turned your intent into a launch plan for ORBITA.',
      goalPreview: {
        title: 'Launch ORBITA',
        deadline,
        strategy: ['Finish the SEO audit', 'Configure deployment', 'Verify the live site'],
        actions: ['Complete the SEO audit', 'Connect Vercel', 'Set environment variables', 'Deploy and verify'],
        dependencies: ['Vercel integration connected', 'Environment variables set'],
        risks: ['The launch date is at risk while deployment is blocked'],
        requiredApproval: 3,
        checklist: orbita?.milestones.map((m) => ({ title: m.title, status: m.status })),
      },
      plan: orbita
        ? {
            agentId: 'a-execution',
            objective: 'Prepare and deploy ORBITA',
            kind: 'deploy',
            steps: deployPlan(orbita),
            linkedProjectId: orbita.id,
          }
        : undefined,
      suggestedChips: ['What is blocking the launch?', 'Analyze my current projects'],
    };
  }

  // Daily briefing
  if (/(what should i do|today|daily|briefing|priorities|start my day|morning)/.test(q)) {
    return {
      type: 'daily-briefing',
      confidence: 0.95,
      summary: 'Here is where ATLAS would focus today.',
      briefing: buildBriefing(state, nba),
      // "Start the day" executes the top priority.
      plan: nba?.plan,
      suggestedChips: ['Execute the top priority', 'Why am I behind?', 'Find opportunities.'],
    };
  }

  // Why am I behind
  if (/(why.*behind|behind|lagging|explain|status|where am i|how am i)/.test(q)) {
    return {
      type: 'explain-status',
      confidence: 0.88,
      summary: 'Here is the state of your system.',
      answer: explainStatus(state),
      suggestedChips: ['What should I do today?', 'Build a strategy to reach €2,000/month.'],
    };
  }

  // Find opportunities
  if (/(opportunit|prospect|lead|client)/.test(q) && /(find|look|search|more|new)/.test(q)) {
    return {
      type: 'find-opportunities',
      confidence: 0.85,
      summary: 'SCOUT can run a prospecting sweep right now.',
      answer: `SCOUT is ${scout?.status ?? 'idle'}. ${fresh.length} high-intent prospects are already queued — a sweep can add more today.`,
      plan: {
        agentId: 'a-scout',
        objective: 'Prospecting sweep — find and qualify new leads',
        kind: 'scout-sweep',
        steps: scoutSweepPlan(),
      },
      suggestedChips: ['Contact the current queue', 'What should I do today?'],
    };
  }

  // Build a strategy to reach €X / month
  const money = q.match(/[€$£]\s?([\d,]+)/);
  if (/(strategy|plan|reach|build|get to|grow to)/.test(q) && (money || /(revenue|mrr|month)/.test(q))) {
    const target = money ? Number(money[1].replace(/,/g, '')) : 2000;
    const deadline = new Date(Date.now() + 90 * 86400000).toISOString();
    return {
      type: 'build-strategy',
      confidence: 0.78,
      summary: `A strategy to reach ${formatCurrency(target)}/month — built on your assumptions, not promises.`,
      goalPreview: {
        title: `${formatCurrency(target)} monthly revenue`,
        deadline,
        strategy: ['Premium websites (€3.5k–€8k)', 'AI automation retainers', 'Outbound acquisition'],
        actions: ['14 qualified prospects / day', '6 conversations / day', '2 proposals / day', '3–4 clients / month'],
        dependencies: ['ORBITA live as proof', 'A daily prospecting cadence'],
        risks: ['Reply rate is declining', 'Pipeline concentration on outbound'],
        requiredApproval: 1,
      },
      suggestedChips: ['Create this as a goal', 'What should I do today?', 'Analyze my current projects'],
    };
  }

  // Prepare ORBITA for launch
  if (/(prepare|get|make).*(launch|ready)/.test(q)) {
    const deadline = orbita?.deadline ?? new Date(Date.now() + 6 * 86400000).toISOString();
    return {
      type: 'prepare-launch',
      confidence: 0.88,
      summary: `Launch readiness for ORBITA — deadline ${formatDateLong(deadline)}.`,
      goalPreview: {
        title: 'Launch ORBITA',
        deadline,
        strategy: ['Finish the SEO audit', 'Configure deployment', 'Verify the live site'],
        actions: ['Complete the SEO audit', 'Connect Vercel', 'Set environment variables', 'Deploy and verify'],
        dependencies: ['Vercel integration connected', 'Environment variables set'],
        risks: ['Deployment is blocked until Vercel is connected'],
        requiredApproval: 3,
        checklist: orbita?.milestones.map((m) => ({ title: m.title, status: m.status })),
      },
      plan: orbita
        ? {
            agentId: 'a-execution',
            objective: 'Prepare ORBITA for launch',
            kind: 'deploy',
            steps: deployPlan(orbita),
            linkedProjectId: orbita.id,
          }
        : undefined,
      suggestedChips: ['What is blocking the launch?', 'Launch my website.'],
    };
  }

  // Analyze projects
  if (/analy/.test(q) && /(project|portfolio|everything|all|business)/.test(q)) {
    return {
      type: 'analyze-projects',
      confidence: 0.9,
      summary: 'Your projects, measured from structured state.',
      answer: analyzeProjects(state),
      suggestedChips: ['What should I do today?', 'Why am I behind?'],
    };
  }

  // Create goal
  if (/(create|new|add|set|define).*(goal|target|objective)/.test(q)) {
    return {
      type: 'create-goal',
      confidence: 0.92,
      summary: 'Define the goal — ATLAS will structure the strategy around it.',
      suggestedChips: ['Build a strategy to reach €2,000/month.', 'What should I do today?'],
    };
  }

  // Run an agent
  const agentWord = q.match(/scout|research|content|seo|execution|deployment/);
  if (agentWord && /(run|start|ask|tell|launch|have)/.test(q)) {
    const agentId = AGENT_NAME_TO_ID[agentWord[0]];
    const agent = state.agents.find((a) => a.id === agentId);
    return {
      type: 'run-agent',
      confidence: 0.82,
      summary: `${agent?.name ?? 'The agent'} will pick this up. Sensitive steps still need your approval.`,
      agentId,
      plan: {
        agentId,
        objective: input.trim().replace(/^(run|start|ask|tell|have)\s*/i, '') || `${agent?.name ?? 'Agent'} task`,
        kind: agentId === 'a-scout' ? 'scout-sweep' : agentId === 'a-research' ? 'research' : agentId === 'a-content' ? 'content' : 'generic',
        steps: [], // filled by the store via agentPlan()
      },
      suggestedChips: ['What should I do today?', 'Analyze my current projects'],
    };
  }

  // Execute the next best action
  if (/\b(execute|do it|start|go|run it|next best|highest[- ]value|just do)\b/.test(q) && nba) {
    return {
      type: 'start-nba',
      confidence: 0.9,
      summary: nba.title,
      plan: nba.plan,
      suggestedChips: ['What should I do today?', 'Why am I behind?'],
    };
  }

  return {
    type: 'unknown',
    confidence: 0.4,
    summary: 'ATLAS needs a clearer objective.',
    answer: 'I can plan launches, find opportunities, build strategies, or explain your current state. Try one of these:',
    suggestedChips: baseChips,
  };
}

// ---------------------------------------------------------------- run lifecycle

export interface RunSpec {
  agentId: ID;
  objective: string;
  kind: RunKind;
  steps: RunStep[];
  createdBy: 'user' | 'atlas';
  linkedGoalId?: ID;
  linkedProjectId?: ID;
  linkedOpportunityIds?: ID[];
}

export function buildRun(spec: RunSpec): AgentRun {
  return {
    id: uid('run'),
    agentId: spec.agentId,
    objective: spec.objective,
    kind: spec.kind,
    status: 'thinking',
    steps: spec.steps.map((s) => ({ ...s, id: s.id || uid('step'), status: 'pending', ticksLeft: 0 })),
    currentStepIndex: 0,
    progress: 0,
    startedAt: new Date().toISOString(),
    createdBy: spec.createdBy,
    linkedGoalId: spec.linkedGoalId,
    linkedProjectId: spec.linkedProjectId,
    linkedOpportunityIds: spec.linkedOpportunityIds,
    approvalIds: [],
  };
}

function activity(
  kind: ActivityEvent['kind'],
  actor: string,
  title: string,
  detail?: string,
  tone: ActivityEvent['tone'] = 'info',
): ActivityEvent {
  return { id: uid('act'), time: new Date().toISOString(), kind, actor, title, detail, tone };
}

function makeToast(title: string, body?: string, tone: Toast['tone'] = 'info', persistent = false): Toast {
  return { id: uid('toast'), title, body, tone, createdAt: new Date().toISOString(), persistent };
}

function agentName(state: AtlasState, agentId: ID): string {
  return state.agents.find((a) => a.id === agentId)?.name ?? 'ATLAS';
}

function patchAgent(state: AtlasState, agentId: ID, patch: Partial<AtlasState['agents'][number]>): AtlasState['agents'] {
  return state.agents.map((a) => (a.id === agentId ? { ...a, ...patch } : a));
}

function patchRun(state: AtlasState, runId: ID, patch: Partial<AgentRun>): AtlasState {
  return {
    ...state,
    runs: state.runs.map((r) => (r.id === runId ? { ...r, ...patch } : r)),
  };
}

function markStep(steps: RunStep[], index: number, patch: Partial<RunStep>): RunStep[] {
  return steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
}

function stepProgress(steps: RunStep[], currentIndex: number): number {
  if (!steps.length) return 100;
  const done = steps.filter((s) => s.status === 'done').length;
  const base = (done / steps.length) * 100;
  const current = steps[currentIndex];
  const currentShare = current && current.status === 'running' ? (1 / steps.length) * 50 * (1 - (current.ticksLeft || 0) / Math.max(1, current.ticks)) : 0;
  return Math.min(100, Math.round(base + currentShare));
}

export function attachRun(state: AtlasState, run: AgentRun): AtlasState {
  const name = agentName(state, run.agentId);
  return {
    ...state,
    runs: [run, ...state.runs],
    agents: patchAgent(state, run.agentId, {
      status: 'running',
      currentTask: run.objective,
      progress: 0,
      activity: [
        { id: uid('agact'), time: run.startedAt, title: `Started — ${run.objective}`, tone: 'info' as const },
        ...state.agents.find((a) => a.id === run.agentId)?.activity ?? [],
      ].slice(0, 30),
    }),
    activities: [activity('agent', name, `Started run — ${run.objective}`, undefined, 'info'), ...state.activities],
    toasts: [...state.toasts, makeToast('ATLAS is working', run.objective, 'info')],
  };
}

function isStepBlockedByIntegration(state: AtlasState, step: RunStep): boolean {
  const needsIntegration = Boolean(step.integrationId) || Boolean(step.external);
  if (!needsIntegration) return false;
  const ids = [step.integrationId, ...(step.altIntegrationIds ?? [])].filter(Boolean) as ID[];
  if (ids.length === 0) return true;
  return !ids.some((id) => state.integrations.find((i) => i.id === id)?.connected);
}

function applyStepEffect(state: AtlasState, run: AgentRun, step: RunStep): AtlasState {
  if (!step.effect) return state;
  if (step.effect.type === 'complete-milestone') {
    const { projectId, milestoneTitle } = step.effect;
    let next = {
      ...state,
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones.map((m) =>
                m.title === milestoneTitle ? { ...m, status: 'done' as const } : m,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    };
    // Sync linked goal progress from the project.
    const project = next.projects.find((p) => p.id === projectId);
    if (project) {
      const progress = deriveProjectProgress(project);
      next = {
        ...next,
        goals: next.goals.map((g) =>
          g.linkedProjectId === projectId
            ? { ...g, current: progress, status: progress >= 100 ? ('completed' as const) : g.status, updatedAt: new Date().toISOString() }
            : g,
        ),
      };
      // A project that finished its last milestone is no longer blocked by it.
      if (project.status === 'blocked' && !project.milestones.some((m) => m.status !== 'done')) {
        next = {
          ...next,
          projects: next.projects.map((p) => (p.id === projectId ? { ...p, status: 'active' as const, blockers: [] } : p)),
        };
      }
    }
    return {
      ...next,
      activities: [
        activity('agent', agentName(state, run.agentId), `Milestone completed — ${milestoneTitle}`, project?.name, 'success'),
        ...next.activities,
      ],
    };
  }
  return state;
}

const RUN_RESULTS: Record<RunKind, (run: AgentRun, state: AtlasState) => string> = {
  outreach: (run, state) => {
    const sent = run.steps.find((s) => s.title === 'Send messages')?.status === 'done';
    const n = run.linkedOpportunityIds?.length ?? state.opportunities.filter((o) => o.status === 'new').length;
    return sent ? `${n} prospects contacted. Follow-ups scheduled.` : `${n} messages prepared and approved.`;
  },
  'send-approved': (run) => `${run.linkedOpportunityIds?.length ?? 0} approved messages sent. Results logged to SCOUT.`,
  deploy: () => 'ORBITA deployed and verified live.',
  catalog: () => 'WEAF catalog completed — every item is live.',
  'seo-audit': () => 'SEO audit complete — safe fixes applied.',
  'scout-sweep': () => 'Sweep complete — new signals queued for review.',
  research: () => 'Research report delivered.',
  content: () => 'Asset approved and saved. Connect a channel to publish.',
  generic: () => 'Run completed.',
};

function completeRun(state: AtlasState, runId: ID): AtlasState {
  const run = state.runs.find((r) => r.id === runId);
  if (!run) return state;
  const finishedAt = new Date().toISOString();
  const name = agentName(state, run.agentId);
  const result = RUN_RESULTS[run.kind]?.(run, state) ?? 'Run completed.';

  let next = patchRun(state, runId, { status: 'completed', finishedAt, progress: 100, result });

  // Kind-level side effects.
  if (run.kind === 'outreach' || run.kind === 'send-approved') {
    const sent = run.steps.find((s) => s.title === 'Send messages')?.status === 'done';
    if (sent && run.linkedOpportunityIds?.length) {
      next = {
        ...next,
        opportunities: next.opportunities.map((o) =>
          run.linkedOpportunityIds!.includes(o.id)
            ? { ...o, status: 'contacted' as const, contactedAt: finishedAt, outreachApproved: false }
            : o,
        ),
      };
    }
  }

  const agent = state.agents.find((a) => a.id === run.agentId);
  next = {
    ...next,
    agents: patchAgent(next, run.agentId, {
      status: 'completed',
      progress: 100,
      lastRunAt: finishedAt,
      results: [result, ...(agent?.results ?? [])].slice(0, 10),
      activity: [
        { id: uid('agact'), time: finishedAt, title: `Completed — ${run.objective}`, detail: result, tone: 'success' as const },
        ...(agent?.activity ?? []),
      ].slice(0, 30),
    }),
    activities: [
      activity('agent', name, `Completed — ${run.objective}`, result, 'success'),
      ...next.activities,
    ],
    toasts: [...next.toasts, makeToast('Run completed', result, 'success')],
  };
  return next;
}

function cancelRun(state: AtlasState, runId: ID, reason: string): AtlasState {
  const run = state.runs.find((r) => r.id === runId);
  if (!run) return state;
  const finishedAt = new Date().toISOString();
  const name = agentName(state, run.agentId);
  return {
    ...patchRun(state, runId, { status: 'cancelled', finishedAt, error: reason }),
    agents: patchAgent(state, run.agentId, { status: 'idle' }),
    activities: [
      activity('system', 'ATLAS', `Run cancelled — ${run.objective}`, reason, 'warning'),
      ...state.activities,
    ],
    toasts: [...state.toasts, makeToast('Run cancelled', reason, 'warning', true)],
  };
}

const ACTIVE_RUN_STATUSES: AgentRunStatus[] = ['thinking', 'preparing', 'executing', 'waiting-approval'];

function advanceRun(state: AtlasState, runId: ID): AtlasState {
  const run = state.runs.find((r) => r.id === runId);
  if (!run || !ACTIVE_RUN_STATUSES.includes(run.status)) return state;

  switch (run.status) {
    case 'thinking':
      return patchRun(state, runId, { status: 'preparing', progress: 4 });

    case 'preparing': {
      const idx = run.steps.findIndex((s) => s.status === 'pending');
      if (idx === -1) return completeRun(state, runId);
      const step = run.steps[idx];
      return patchRun(state, runId, {
        status: 'executing',
        currentStepIndex: idx,
        progress: stepProgress(run.steps, idx),
        steps: markStep(run.steps, idx, { status: 'running', ticksLeft: Math.max(1, step.ticks) }),
      });
    }

    case 'waiting-approval': {
      const step = run.steps[run.currentStepIndex];
      const approval = step?.approvalId ? state.approvals.find((a) => a.id === step.approvalId) : undefined;
      if (!approval) return state;
      if (approval.status === 'approved') {
        return {
          ...patchRun(state, runId, { status: 'executing' }),
          agents: patchAgent(state, run.agentId, { status: 'running' }),
        };
      }
      if (approval.status === 'rejected') {
        return cancelRun(state, runId, approval.resolvedAt ? 'Approval rejected by you.' : 'Approval rejected.');
      }
      return state;
    }

    case 'executing': {
      const step = run.steps[run.currentStepIndex];
      if (!step) return completeRun(state, runId);

      if (step.status === 'pending') {
        if (step.requiresApproval && !step.approvalId) {
          const name = agentName(state, run.agentId);
          const approval: Approval = {
            id: uid('appr'),
            level: step.approvalLevel ?? 3,
            action: step.title,
            description: step.detail || run.objective,
            context: { agent: name, detail: run.objective },
            status: 'pending',
            runId,
            effect: { type: 'none' },
            createdAt: new Date().toISOString(),
          };
          return {
            ...patchRun(state, runId, {
              status: 'waiting-approval',
              steps: markStep(run.steps, run.currentStepIndex, { approvalId: approval.id }),
              approvalIds: [...run.approvalIds, approval.id],
            }),
            approvals: [approval, ...state.approvals],
            agents: patchAgent(state, run.agentId, { status: 'waiting' }),
            activities: [
              activity('approval', 'ATLAS', `Waiting for your approval — ${step.title}`, run.objective, 'warning'),
              ...state.activities,
            ],
            toasts: [
              ...state.toasts,
              makeToast('Approval needed', `${name}: ${step.title}`, 'warning', true),
            ],
          };
        }
        if (isStepBlockedByIntegration(state, step)) {
          const reason = step.blockedReason || 'A required integration is not connected.';
          const agent = state.agents.find((a) => a.id === run.agentId);
          return {
            ...patchRun(state, runId, {
              status: 'blocked',
              error: reason,
              steps: markStep(run.steps, run.currentStepIndex, { status: 'blocked' }),
            }),
            agents: patchAgent(state, run.agentId, {
              status: 'blocked',
              errors: [...(agent?.errors ?? []), reason].slice(-5),
            }),
            activities: [
              activity('agent', agentName(state, run.agentId), `Blocked — ${run.objective}`, reason, 'error'),
              ...state.activities,
            ],
            toasts: [...state.toasts, makeToast('Execution blocked', reason, 'error', true)],
          };
        }
        return patchRun(state, runId, {
          steps: markStep(run.steps, run.currentStepIndex, { status: 'running', ticksLeft: Math.max(1, step.ticks) }),
        });
      }

      if (step.status === 'running') {
        const ticksLeft = (step.ticksLeft || 1) - 1;
        if (ticksLeft > 0) {
          return patchRun(state, runId, {
            steps: markStep(run.steps, run.currentStepIndex, { ticksLeft }),
            progress: stepProgress(run.steps, run.currentStepIndex),
          });
        }
        let next = patchRun(state, runId, {
          steps: markStep(run.steps, run.currentStepIndex, { status: 'done', ticksLeft: 0 }),
          progress: stepProgress(run.steps, run.currentStepIndex),
        });
        next = applyStepEffect(next, run, step);
        const nextIdx = next.runs.find((r) => r.id === runId)!.steps.findIndex((s) => s.status === 'pending');
        if (nextIdx === -1) return completeRun(next, runId);
        return patchRun(next, runId, {
          currentStepIndex: nextIdx,
          progress: stepProgress(next.runs.find((r) => r.id === runId)!.steps, nextIdx),
        });
      }

      return state;
    }

    default:
      return state;
  }
}

/** Advance every active run by one tick. */
export function tickRuns(state: AtlasState): AtlasState {
  let next = state;
  for (const run of state.runs) {
    if (!ACTIVE_RUN_STATUSES.includes(run.status)) continue;
    next = advanceRun(next, run.id);
  }
  return next;
}

// ---------------------------------------------------------------- approvals

export function approveApproval(state: AtlasState, approvalId: ID): AtlasState {
  const approval = state.approvals.find((a) => a.id === approvalId);
  if (!approval || approval.status !== 'pending') return state;
  const resolvedAt = new Date().toISOString();

  let next: AtlasState = {
    ...state,
    approvals: state.approvals.map((a) =>
      a.id === approvalId
        ? { ...a, status: approval.runId ? 'approved' : 'executed', resolvedAt }
        : a,
    ),
  };

  if (approval.runId) {
    const run = state.runs.find((r) => r.id === approval.runId);
    next = patchRun(next, approval.runId, { status: 'executing' });
    if (run) {
      next = { ...next, agents: patchAgent(next, run.agentId, { status: 'running' }) };
    }
  } else if (approval.effect?.type === 'memory') {
    next = addMemoryEntry(next, approval.effect.category, approval.action, approval.effect.text);
  } else if (approval.effect?.type === 'spawn-run') {
    const run = buildRun({
      agentId: approval.effect.agentId,
      objective: approval.effect.objective,
      kind: approval.effect.kind,
      steps: approval.effect.kind === 'send-approved' ? sendApprovedPlan(3) : agentPlan(approval.effect.agentId, approval.effect.objective, state),
      createdBy: 'user',
    });
    next = attachRun(next, run);
  }

  return {
    ...next,
    activities: [
      activity('user', 'You', `Approved — ${approval.action}`, approval.description, 'success'),
      ...next.activities,
    ],
    toasts: [...next.toasts, makeToast('Approved', approval.action, 'success')],
  };
}

export function rejectApproval(state: AtlasState, approvalId: ID, reason = 'Rejected by you.'): AtlasState {
  const approval = state.approvals.find((a) => a.id === approvalId);
  if (!approval || approval.status !== 'pending') return state;
  const resolvedAt = new Date().toISOString();
  let next: AtlasState = {
    ...state,
    approvals: state.approvals.map((a) => (a.id === approvalId ? { ...a, status: 'rejected', resolvedAt } : a)),
  };
  if (approval.runId) {
    next = cancelRun(next, approval.runId, reason);
  }
  return {
    ...next,
    activities: [
      activity('user', 'You', `Rejected — ${approval.action}`, reason, 'warning'),
      ...next.activities,
    ],
    toasts: [...next.toasts, makeToast('Rejected', approval.action, 'warning')],
  };
}

// ---------------------------------------------------------------- memory / goals

export function addMemoryEntry(
  state: AtlasState,
  category: AtlasState['memories'][number]['category'],
  key: string,
  value: string,
): AtlasState {
  const entry = {
    id: uid('mem'),
    category,
    key,
    value,
    updatedAt: new Date().toISOString(),
  };
  return {
    ...state,
    memories: [entry, ...state.memories.filter((m) => !(m.category === category && m.key.toLowerCase() === key.toLowerCase()))],
  };
}

export interface CreateGoalInput {
  title: string;
  objective: string;
  unit: Goal['unit'];
  target: number;
  deadline: string;
  currency?: Goal['currency'];
}

export function createGoal(state: AtlasState, input: CreateGoalInput): { state: AtlasState; goal: Goal } {
  const now = new Date().toISOString();
  const goal: Goal = {
    id: uid('goal'),
    title: input.title,
    objective: input.objective,
    unit: input.unit,
    target: input.target,
    current: 0,
    currency: input.currency,
    deadline: input.deadline,
    status: 'on-track',
    strategy: [],
    assumptions: [],
    milestones: [],
    risks: [],
    nextActions: [],
    aiRecommendation: 'ATLAS will generate a strategy and milestones once this goal has some activity.',
    createdAt: now,
    updatedAt: now,
  };
  return {
    state: {
      ...state,
      goals: [goal, ...state.goals],
      activities: [activity('user', 'You', `Created goal — ${goal.title}`, goal.objective, 'success'), ...state.activities],
      toasts: [...state.toasts, makeToast('Goal created', goal.title, 'success')],
    },
    goal,
  };
}

// ---------------------------------------------------------------- ambient life

/** Starts a background SCOUT sweep when the system is otherwise idle. */
export function maybeStartAmbientRun(state: AtlasState): AtlasState {
  if (!state.hydrated) return state;
  // Only when the whole system is idle — never stack work on an active run.
  const hasActive = state.runs.some((r) => ACTIVE_RUN_STATUSES.includes(r.status));
  if (hasActive) return state;
  const scout = state.agents.find((a) => a.id === 'a-scout');
  if (!scout || scout.status === 'blocked') return state;
  const run = buildRun({
    agentId: 'a-scout',
    objective: 'Morning prospect sweep',
    kind: 'scout-sweep',
    steps: scoutSweepPlan(),
    createdBy: 'atlas',
  });
  return attachRun(state, run);
}

// ---------------------------------------------------------------- toasts

export function dismissToast(state: AtlasState, toastId: ID): AtlasState {
  return { ...state, toasts: state.toasts.filter((t) => t.id !== toastId) };
}

export function dismissExpiredToasts(state: AtlasState): AtlasState {
  const cutoff = Date.now() - 6000;
  const remaining = state.toasts.filter((t) => t.persistent || new Date(t.createdAt).getTime() > cutoff);
  return remaining.length === state.toasts.length ? state : { ...state, toasts: remaining };
}

// ---------------------------------------------------------------- helpers for UI

export function permissionGateLabel(level: ApprovalLevel): string {
  return `${permissionShort(level)} · requires approval`;
}

export function milestoneChecklist(milestones: Milestone[]) {
  return milestones.map((m) => ({ title: m.title, status: m.status }));
}

export type { Opportunity };
