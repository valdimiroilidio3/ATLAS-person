// ATLAS engine — intent interpretation, next-best-action derivation,
// execution planning and the agent-run state machine.
//
// Everything here is a pure function over AtlasState so the store can
// drive it with timers and the UI can drive it with user actions.

import { formatCurrency, formatDateLong } from './format';
import { t } from '@/lib/i18n';
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
    blockedReason: t('No connected channel. Connect Gmail or WhatsApp to send messages.'),
    ticks: 1,
  });
}

function outreachPlan(count: number): RunStep[] {
  return [
    makeStep({
      title: t('Qualify prospects against your ICP'),
      detail: t('Scoring model v2 · threshold 75'),
      ticks: 1,
    }),
    makeStep({
      title: t('Draft personalized messages'),
      detail: `${count} messages · direct tone · your voice`,
      ticks: 2,
    }),
    makeStep({
      title: t('Review and approve messages'),
      detail: t('Nothing is sent without your approval'),
      requiresApproval: true,
      approvalLevel: 3,
      ticks: 1,
    }),
    sendStep(t('Send messages'), t('Via Gmail or WhatsApp')),
    makeStep({
      title: t('Log results to SCOUT'),
      detail: t('Activity, radar and follow-up queue'),
      ticks: 1,
    }),
  ];
}

export function sendApprovedPlan(count: number): RunStep[] {
  return [
    makeStep({
      title: t('Confirm approved messages'),
      detail: `${count} messages approved by you`,
      ticks: 1,
    }),
    sendStep(t('Send messages'), t('Via Gmail or WhatsApp')),
    makeStep({ title: t('Log results to SCOUT'), ticks: 1 }),
  ];
}

export function deployPlan(project: Project): RunStep[] {
  return [
    makeStep({
      title: t('Diagnose deployment configuration'),
      detail: t('Found missing: DATABASE_URL, STRIPE_KEY'),
      ticks: 1,
    }),
    makeStep({
      title: t('Configure environment variables'),
      detail: t('Requires a Vercel connection'),
      integrationId: 'vercel',
      blockedReason: t('Vercel is not connected. Add the integration to configure environment variables.'),
      ticks: 1,
    }),
    makeStep({ title: t('Deploy to production'), ticks: 1 }),
    makeStep({ title: t('Verify live site'), detail: t('Smoke-test key pages'), ticks: 1 }),
  ];
}

export function catalogPlan(project: Project): RunStep[] {
  const active = project.milestones.find((m) => m.status === 'active');
  return [
    makeStep({
      title: `Generate missing copy — ${active?.title ?? 'final item'}`,
      detail: t('Product copy, bundle contents and FAQs'),
      ticks: 2,
    }),
    makeStep({
      title: t('Review catalog changes'),
      detail: t('You approve before anything is applied'),
      requiresApproval: true,
      approvalLevel: 3,
      ticks: 1,
    }),
    makeStep({
      title: t('Apply changes to the catalog'),
      detail: t('Updates the project state in ATLAS'),
      ticks: 1,
      effect: active
        ? { type: 'complete-milestone', projectId: project.id, milestoneTitle: active.title }
        : undefined,
    }),
  ];
}

function seoAuditPlan(project: Project): RunStep[] {
  return [
    makeStep({ title: `Crawl ${project.name}`, detail: t('Full technical crawl'), ticks: 1 }),
    makeStep({ title: t('Analyze known issues'), detail: t('18 issues triaged by severity'), ticks: 2 }),
    makeStep({ title: t('Generate fix list'), detail: t('Prioritized by traffic impact'), ticks: 1 }),
    makeStep({
      title: t('Apply safe fixes'),
      detail: t('Meta descriptions, alt text, sitemap'),
      requiresApproval: true,
      approvalLevel: 2,
      ticks: 1,
      effect: { type: 'complete-milestone', projectId: project.id, milestoneTitle: t('SEO audit') },
    }),
  ];
}

function scoutSweepPlan(): RunStep[] {
  return [
    makeStep({ title: t('Scan configured sources'), detail: t('LinkedIn, web, job boards'), ticks: 1 }),
    makeStep({ title: t('Score against ICP'), detail: t('Scoring model v2'), ticks: 2 }),
    makeStep({ title: t('Queue top prospects'), detail: t('Threshold 75'), ticks: 1 }),
    makeStep({ title: t('Update radar'), detail: t('Signals and trends'), ticks: 1 }),
  ];
}

function researchPlan(objective: string): RunStep[] {
  return [
    makeStep({ title: t('Define research scope'), detail: objective, ticks: 1 }),
    makeStep({ title: t('Gather sources'), ticks: 2 }),
    makeStep({ title: t('Synthesize findings'), ticks: 2 }),
    makeStep({ title: t('Deliver report'), ticks: 1 }),
  ];
}

function contentPlan(objective: string): RunStep[] {
  return [
    makeStep({ title: t('Draft asset'), detail: objective, ticks: 2 }),
    makeStep({
      title: t('Review draft'),
      detail: t('Nothing is published without your approval'),
      requiresApproval: true,
      approvalLevel: 3,
      ticks: 1,
    }),
    makeStep({
      title: 'Publish',
      detail: t('Deliver via a connected channel'),
      external: true,
      blockedReason: t('No publishing channel is connected. The approved draft is saved in ATLAS.'),
      ticks: 1,
    }),
  ];
}

function executionPlan(objective: string): RunStep[] {
  return [
    makeStep({ title: t('Diagnose current state'), detail: objective, ticks: 1 }),
    makeStep({
      title: t('Prepare execution plan'),
      detail: t('Steps, dependencies and risks'),
      requiresApproval: true,
      approvalLevel: 3,
      ticks: 1,
    }),
    makeStep({
      title: 'Execute',
      detail: t('External actions need a connected integration'),
      external: true,
      blockedReason: t('No connected integration can perform this action yet.'),
      ticks: 2,
    }),
    makeStep({ title: t('Verify outcome'), ticks: 1 }),
  ];
}

function deploymentPlan(projectName: string): RunStep[] {
  return [
    makeStep({ title: t('Build project'), ticks: 1 }),
    makeStep({
      title: t('Configure environment'),
      detail: t('Requires a Vercel connection'),
      integrationId: 'vercel',
      blockedReason: t('Vercel is not connected. Add the integration to configure environment variables.'),
      ticks: 1,
    }),
    makeStep({ title: t('Deploy to production'), ticks: 1 }),
    makeStep({ title: t('Verify live site'), ticks: 1 }),
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
      title: t('Send {count} approved messages.', { count: approved.length }),
      reasoning: [
        t('Messages are drafted and approved by you.'),
        t('Waiting on a connected channel — Gmail or WhatsApp.'),
        t('Every send is logged and measured.'),
      ],
      intentText: t('Send the approved outreach messages.'),
      plan: {
        agentId: 'a-scout',
        objective: t('Send {count} approved messages', { count: approved.length }),
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
      icp > 0 ? t('{count} match your ideal customer profile.', { count: icp }) : null,
      engaged > 0 ? t('{count} recently interacted with your site.', { count: engaged }) : null,
      outdated > 0 ? t('{count} have a clear website opportunity.', { count: outdated }) : null,
      t('SCOUT scored them against your ICP — threshold 75.'),
    ].filter(Boolean) as string[];
    return {
      id: 'outreach',
      kind: 'outreach',
      priority: 1,
      agentId: 'a-scout',
      title: t('Contact {count} high-intent leads.', { count: fresh.length }),
      reasoning,
      intentText: t('Contact {count} high-intent leads.', { count: fresh.length }),
      plan: {
        agentId: 'a-scout',
        objective: t('Contact {count} high-intent leads', { count: fresh.length }),
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
      title: t('Resolve the ORBITA deployment blocker.'),
      reasoning: [
        t('Your launch date is in 6 days.'),
        t('Deployment is blocked: environment variables are missing.'),
        t('Vercel must be connected to configure them.'),
      ],
      intentText: t('Prepare ORBITA for launch.'),
      plan: {
        agentId: 'a-execution',
        objective: t('Resolve the ORBITA deployment blocker'),
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
        title: t('Complete {project} — {milestone}.', { project: 'WEAF', milestone: active.title.toLowerCase() }),
        reasoning: [
          t('{project} is at {progress}%.', { project: 'WEAF', progress: deriveProjectProgress(weaf) }),
          t('One catalog item remains.'),
          t('The CONTENT agent can draft it now.'),
        ],
        intentText: t('Complete the WEAF catalog.'),
        plan: {
          agentId: 'a-content',
          objective: t('Complete the WEAF catalog'),
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
        title: t('Finish the ORBITA SEO audit.'),
        reasoning: [
          t('18 issues found so far.'),
          t('Safe fixes can be applied automatically.'),
          t('The launch checklist depends on it.'),
        ],
        intentText: t('Finish the ORBITA SEO audit.'),
        plan: {
          agentId: 'a-seo',
          objective: t('Finish the ORBITA SEO audit'),
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
  // Portuguese aliases
  pesquisa: 'a-research',
  conteudo: 'a-content',
  'conteúdo': 'a-content',
  execucao: 'a-execution',
  'execução': 'a-execution',
  implantar: 'a-deployment',
  implantacao: 'a-deployment',
  'implantação': 'a-deployment',
};

function buildBriefing(state: AtlasState, nba: NextBestAction | null) {
  const orbita = state.projects.find((p) => p.id === 'p-orbita');
  const weaf = state.projects.find((p) => p.id === 'p-weaf');
  const fresh = state.opportunities.filter((o) => o.status === 'new' && !o.outreachApproved);
  const icp = fresh.filter((o) => o.signals.some((s) => /ideal customer/i.test(s))).length;
  return {
    priorities: [
      nba ? nba.title : t('Review your goals.'),
      orbita?.status === 'blocked' ? t('Resolve the ORBITA deployment blocker.') : t('Finish the ORBITA SEO audit.'),
      weaf?.milestones.some((m) => m.status === 'active') ? t('Complete the WEAF catalog.') : t('Review pending approvals.'),
    ],
    avoid: t('Spending time polishing the UI before launch.'),
    opportunity: icp > 0 ? t('{count} new prospects match your ideal customer profile.', { count: icp }) : t('Your pipeline is quiet — ask SCOUT to find more prospects.'),
  };
}

function explainStatus(state: AtlasState): string {
  const revenue = state.goals.find((g) => g.id === 'g-revenue');
  const orbita = state.projects.find((p) => p.id === 'p-orbita');
  const lines: string[] = [];
  if (revenue) {
    const projected = revenue.projected ?? revenue.current;
    lines.push(
      t('Revenue is at {current} of {target} ({progress}%). At your current pace you project {projected} — {short} short.', {
        current: formatCurrency(revenue.current),
        target: formatCurrency(revenue.target),
        progress: goalProgress(revenue),
        projected: formatCurrency(projected),
        short: formatCurrency(Math.max(0, revenue.target - projected)),
      }),
    );
  }
  if (orbita) {
    lines.push(
      orbita.status === 'blocked'
        ? t('ORBITA is at {progress}% but blocked: {reason} The launch checklist cannot finish until deployment unblocks.', {
            progress: deriveProjectProgress(orbita),
            reason: orbita.blockers[0]?.reason ?? t('a blocker needs attention.'),
          })
        : t('ORBITA is at {progress}% and on track.', { progress: deriveProjectProgress(orbita) }),
    );
  }
  const fresh = state.opportunities.filter((o) => o.status === 'new');
  lines.push(
    fresh.length > 0
      ? t('SCOUT has {count} high-intent prospects waiting — that is your fastest lever today.', { count: fresh.length })
      : t('Your prospect queue is empty — a SCOUT sweep would refill it.'),
  );
  return lines.join(' ');
}

function analyzeProjects(state: AtlasState): string {
  return state.projects
    .map((p) => {
      const progress = deriveProjectProgress(p);
      const blocker = p.blockers[0];
      const tail = blocker ? ` ${t('Blocked: {title}.', { title: blocker.title.toLowerCase() })}` : p.milestones.some((m) => m.status === 'active') ? ` ${t('On track.')}` : '';
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
    t('What should I do today?'),
    t('Launch my website.'),
    t('Why am I behind?'),
    t('Find opportunities.'),
    t('Build a strategy to reach €2,000/month.'),
  ];

  // Launch my website / ORBITA
  if (/(launch|ship|deploy|go live|lan[çc]|publicar|estrear|colocar no ar)/i.test(q) && /(website|orbita|site|portfolio|portf[óo]lio)/i.test(q)) {
    const deadline = new Date(Date.now() + 6 * 86400000).toISOString();
    return {
      type: 'launch-project',
      confidence: 0.9,
      summary: t('ATLAS turned your intent into a launch plan for ORBITA.'),
      goalPreview: {
        title: t('Launch ORBITA'),
        deadline,
        strategy: [t('Finish the SEO audit'), t('Configure deployment'), t('Verify the live site')],
        actions: [t('Complete the SEO audit'), t('Connect Vercel'), t('Set environment variables'), t('Deploy and verify')],
        dependencies: [t('Vercel integration connected'), t('Environment variables set')],
        risks: [t('The launch date is at risk while deployment is blocked')],
        requiredApproval: 3,
        checklist: orbita?.milestones.map((m) => ({ title: m.title, status: m.status })),
      },
      plan: orbita
        ? {
            agentId: 'a-execution',
            objective: t('Prepare and deploy ORBITA'),
            kind: 'deploy',
            steps: deployPlan(orbita),
            linkedProjectId: orbita.id,
          }
        : undefined,
      suggestedChips: [t('What is blocking the launch?'), t('Analyze my current projects')],
    };
  }

  // Daily briefing
  if (/(what should i do|today|daily|briefing|priorities|start my day|morning|o que (devo|faço)|hoje|manhã|manha|prioridades|come[çc]ar o dia)/i.test(q)) {
    return {
      type: 'daily-briefing',
      confidence: 0.95,
      summary: t('Here is where ATLAS would focus today.'),
      briefing: buildBriefing(state, nba),
      // "Start the day" executes the top priority.
      plan: nba?.plan,
      suggestedChips: [t('Execute the top priority'), t('Why am I behind?'), t('Find opportunities.')],
    };
  }

  // Why am I behind
  if (/(why.*behind|behind|lagging|explain|status|where am i|how am i|porqu[eé].*atras|atrasad|explica|estado|onde estou|como estou)/i.test(q)) {
    return {
      type: 'explain-status',
      confidence: 0.88,
      summary: t('Here is the state of your system.'),
      answer: explainStatus(state),
      suggestedChips: [t('What should I do today?'), t('Build a strategy to reach €2,000/month.')],
    };
  }

  // Find opportunities
  if (/(opportunit|prospect|lead|client|oportunidade|prospect|client)/i.test(q) && /(find|look|search|more|new|encontr|procur|busc|mais|nov)/i.test(q)) {
    return {
      type: 'find-opportunities',
      confidence: 0.85,
      summary: t('SCOUT can run a prospecting sweep right now.'),
      answer: t('SCOUT is {status}. {count} high-intent prospects are already queued — a sweep can add more today.', { status: scout?.status ?? 'idle', count: fresh.length }),
      plan: {
        agentId: 'a-scout',
        objective: t('Prospecting sweep — find and qualify new leads'),
        kind: 'scout-sweep',
        steps: scoutSweepPlan(),
      },
      suggestedChips: [t('Contact the current queue'), t('What should I do today?')],
    };
  }

  // Build a strategy to reach €X / month
  const money = q.match(/[€$£]\s?([\d,]+)/);
  if (/(strategy|plan|reach|build|get to|grow to|estrat[eé]gia|plano|atingir|chegar|crescer|construir)/i.test(q) && (money || /(revenue|mrr|month|receita|mensal|m[eê]s)/i.test(q))) {
    const target = money ? Number(money[1].replace(/,/g, '')) : 2000;
    const deadline = new Date(Date.now() + 90 * 86400000).toISOString();
    return {
      type: 'build-strategy',
      confidence: 0.78,
      summary: t('A strategy to reach {target}/month — built on your assumptions, not promises.', { target: formatCurrency(target) }),
      goalPreview: {
        title: t('{target} monthly revenue', { target: formatCurrency(target) }),
        deadline,
        strategy: [t('Premium websites (€3.5k–€8k)'), t('AI automation retainers'), t('Outbound acquisition')],
        actions: [t('14 qualified prospects / day'), t('6 conversations / day'), t('2 proposals / day'), t('3–4 clients / month')],
        dependencies: [t('ORBITA live as proof'), t('A daily prospecting cadence')],
        risks: [t('Reply rate is declining'), t('Pipeline concentration on outbound')],
        requiredApproval: 1,
      },
      suggestedChips: [t('Create this as a goal'), t('What should I do today?'), t('Analyze my current projects')],
    };
  }

  // Prepare ORBITA for launch
  if (/(prepare|get|make|preparar|deixar|deixa).*(launch|ready|lan[çc]amento|pront)/i.test(q)) {
    const deadline = orbita?.deadline ?? new Date(Date.now() + 6 * 86400000).toISOString();
    return {
      type: 'prepare-launch',
      confidence: 0.88,
      summary: t('Launch readiness for ORBITA — deadline {date}.', { date: formatDateLong(deadline) }),
      goalPreview: {
        title: t('Launch ORBITA'),
        deadline,
        strategy: [t('Finish the SEO audit'), t('Configure deployment'), t('Verify the live site')],
        actions: [t('Complete the SEO audit'), t('Connect Vercel'), t('Set environment variables'), t('Deploy and verify')],
        dependencies: [t('Vercel integration connected'), t('Environment variables set')],
        risks: [t('Deployment is blocked until Vercel is connected')],
        requiredApproval: 3,
        checklist: orbita?.milestones.map((m) => ({ title: m.title, status: m.status })),
      },
      plan: orbita
        ? {
            agentId: 'a-execution',
            objective: t('Prepare ORBITA for launch'),
            kind: 'deploy',
            steps: deployPlan(orbita),
            linkedProjectId: orbita.id,
          }
        : undefined,
      suggestedChips: [t('What is blocking the launch?'), t('Launch my website.')],
    };
  }

  // Analyze projects
  if (/(analy|analis)/i.test(q) && /(project|portfolio|everything|all|business|projet|tudo|neg[oó]cio|portf[óo]lio)/i.test(q)) {
    return {
      type: 'analyze-projects',
      confidence: 0.9,
      summary: t('Your projects, measured from structured state.'),
      answer: analyzeProjects(state),
      suggestedChips: [t('What should I do today?'), t('Why am I behind?')],
    };
  }

  // Create goal
  if (/(create|new|add|set|define|criar|nova|novo|adicionar|definir).*(goal|target|objective|meta|objetivo|alvo)/i.test(q)) {
    return {
      type: 'create-goal',
      confidence: 0.92,
      summary: t('Define the goal — ATLAS will structure the strategy around it.'),
      suggestedChips: [t('Build a strategy to reach €2,000/month.'), t('What should I do today?')],
    };
  }

  // Run an agent
  const agentWord = q.match(/scout|research|pesquisa|content|conteudo|conteúdo|seo|execution|execução|execucao|deployment|implantar|implantacao|implantação/);
  if (agentWord && /(run|start|ask|tell|launch|have|corre|inicia|iniciar|come[çc]|pede|executa|roda|lan[çc])/i.test(q)) {
    const agentId = AGENT_NAME_TO_ID[agentWord[0]];
    const agent = state.agents.find((a) => a.id === agentId);
    return {
      type: 'run-agent',
      confidence: 0.82,
      summary: t('{agent} will pick this up. Sensitive steps still need your approval.', { agent: agent?.name ?? t('The agent') }),
      agentId,
      plan: {
        agentId,
        objective: input.trim().replace(/^(run|start|ask|tell|have|corre|inicia|iniciar|começa|comecar|pede|executa|roda|lança|lançar)\s*/i, '') || t('{agent} task', { agent: agent?.name ?? t('Agent') }),
        kind: agentId === 'a-scout' ? 'scout-sweep' : agentId === 'a-research' ? 'research' : agentId === 'a-content' ? 'content' : 'generic',
        steps: [], // filled by the store via agentPlan()
      },
      suggestedChips: [t('What should I do today?'), t('Analyze my current projects')],
    };
  }

  // Execute the next best action
  if (/\b(execute|do it|start|go|run it|next best|highest[- ]value|just do)\b|(executa|executar|faz|fazer|come[çc]|melhor a[cç][ãa]o)/i.test(q) && nba) {
    return {
      type: 'start-nba',
      confidence: 0.9,
      summary: nba.title,
      plan: nba.plan,
      suggestedChips: [t('What should I do today?'), t('Why am I behind?')],
    };
  }

  return {
    type: 'unknown',
    confidence: 0.4,
    summary: t('ATLAS needs a clearer objective.'),
    answer: t('I can plan launches, find opportunities, build strategies, or explain your current state. Try one of these:'),
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
    toasts: [...state.toasts, makeToast(t('ATLAS is working'), run.objective, 'info')],
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
    const sent = run.steps.find((s) => s.title === t('Send messages') || s.title === 'Send messages')?.status === 'done';
    const n = run.linkedOpportunityIds?.length ?? state.opportunities.filter((o) => o.status === 'new').length;
    return sent ? `${n} prospects contacted. Follow-ups scheduled.` : `${n} messages prepared and approved.`;
  },
  'send-approved': (run) => `${run.linkedOpportunityIds?.length ?? 0} approved messages sent. Results logged to SCOUT.`,
  deploy: () => t('ORBITA deployed and verified live.'),
  catalog: () => t('WEAF catalog completed — every item is live.'),
  'seo-audit': () => t('SEO audit complete — safe fixes applied.'),
  'scout-sweep': () => t('Sweep complete — new signals queued for review.'),
  research: () => t('Research report delivered.'),
  content: () => t('Asset approved and saved. Connect a channel to publish.'),
  generic: () => t('Run completed.'),
};

function completeRun(state: AtlasState, runId: ID): AtlasState {
  const run = state.runs.find((r) => r.id === runId);
  if (!run) return state;
  const finishedAt = new Date().toISOString();
  const name = agentName(state, run.agentId);
  const result = RUN_RESULTS[run.kind]?.(run, state) ?? t('Run completed.');

  let next = patchRun(state, runId, { status: 'completed', finishedAt, progress: 100, result });

  // Kind-level side effects.
  if (run.kind === 'outreach' || run.kind === 'send-approved') {
    const sent = run.steps.find((s) => s.title === t('Send messages') || s.title === 'Send messages')?.status === 'done';
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
    toasts: [...next.toasts, makeToast(t('Run completed'), result, 'success')],
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
    toasts: [...state.toasts, makeToast(t('Run cancelled'), reason, 'warning', true)],
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
        return cancelRun(state, runId, approval.resolvedAt ? t('Approval rejected by you.') : t('Approval rejected.'));
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
              makeToast(t('Approval needed'), `${name}: ${step.title}`, 'warning', true),
            ],
          };
        }
        if (isStepBlockedByIntegration(state, step)) {
          const reason = step.blockedReason || t('A required integration is not connected.');
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
            toasts: [...state.toasts, makeToast(t('Execution blocked'), reason, 'error', true)],
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

export function rejectApproval(state: AtlasState, approvalId: ID, reason = t('Rejected by you.')): AtlasState {
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
    aiRecommendation: t('ATLAS will generate a strategy and milestones once this goal has some activity.'),
    createdAt: now,
    updatedAt: now,
  };
  return {
    state: {
      ...state,
      goals: [goal, ...state.goals],
      activities: [activity('user', 'You', `Created goal — ${goal.title}`, goal.objective, 'success'), ...state.activities],
      toasts: [...state.toasts, makeToast(t('Goal created'), goal.title, 'success')],
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
    objective: t('Morning prospect sweep'),
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
