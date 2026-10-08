// Engine smoke test — run with: npx tsx scripts/test-engine.ts
// Verifies the run state machine end-to-end without a browser.

import { setLocale } from '../lib/i18n';
import { seedState } from '../lib/atlas/seed';
import {
  attachRun,
  approveApproval,
  buildRun,
  createGoal,
  deriveNextBestAction,
  deriveProjectProgress,
  goalProgress,
  interpretIntent,
  maybeStartAmbientRun,
  tickRuns,
} from '../lib/atlas/engine';
import { sendApprovedPlan } from '../lib/atlas/engine';

// The engine localizes its output — assertions below are written against
// the English dictionary, so pin the locale before seeding.
setLocale('en');

let failures = 0;
function check(name: string, cond: boolean | undefined, extra?: unknown) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}`, extra ?? '');
  }
}

console.log('— seed state');
let state = { ...seedState(), hydrated: true };
check('7 new opportunities', state.opportunities.filter((o) => o.status === 'new').length === 7);
check('2 pending approvals', state.approvals.filter((a) => a.status === 'pending').length === 2);
check('ORBITA is 82%', deriveProjectProgress(state.projects.find((p) => p.id === 'p-orbita')!) === 82);
check('SCOUT is 64%', deriveProjectProgress(state.projects.find((p) => p.id === 'p-scout')!) === 64);
check('WEAF is 91%', deriveProjectProgress(state.projects.find((p) => p.id === 'p-weaf')!) === 91);
check('revenue goal 68%', goalProgress(state.goals.find((g) => g.id === 'g-revenue')!) === 68);

console.log('— next best action');
const nba = deriveNextBestAction(state);
check('NBA is outreach', nba?.kind === 'outreach');
check('NBA title mentions 7 leads', nba?.title === 'Contact 7 high-intent leads.', nba?.title);
check('NBA has 5 steps', nba?.plan.steps.length === 5);

console.log('— outreach run lifecycle');
const run = buildRun({ ...nba!.plan, createdBy: 'user' });
state = attachRun(state, run);
check('run starts thinking', state.runs[0].status === 'thinking');
check('activity logged on start', state.activities[0].title.includes('Started run'));

// tick until waiting-approval (qualify=1 tick, draft=2 ticks, plus thinking/preparing transitions)
let ticks = 0;
while (state.runs.find((r) => r.id === run.id)!.status !== 'waiting-approval' && ticks < 20) {
  state = tickRuns(state);
  ticks++;
}
const liveRun = () => state.runs.find((r) => r.id === run.id)!;
check('reaches waiting-approval', liveRun().status === 'waiting-approval', liveRun().status);
check('approval created', liveRun().approvalIds.length === 1);
const approval = state.approvals.find((a) => a.id === liveRun().approvalIds[0])!;
check('approval is pending L3', approval.status === 'pending' && approval.level === 3);
check('agent is waiting', state.agents.find((a) => a.id === 'a-scout')!.status === 'waiting');

// approve -> send step should block (no gmail/whatsapp connected)
state = approveApproval(state, approval.id);
check('run resumes after approval', liveRun().status === 'executing');
ticks = 0;
while (liveRun().status === 'executing' && ticks < 20) {
  state = tickRuns(state);
  ticks++;
}
check('run ends blocked (no channel)', liveRun().status === 'blocked', liveRun().status);
check('blocked reason is honest', (liveRun().error ?? '').includes('Gmail or WhatsApp'), liveRun().error);
check('persistent error toast queued', state.toasts.some((t) => t.tone === 'error' && t.persistent));
check('activity logged for block', state.activities.some((a) => a.title.includes('Blocked')));

console.log('— NBA recomputes after approval-less block (still 7 new)');
const nba2 = deriveNextBestAction(state);
check('NBA still outreach', nba2?.kind === 'outreach');

console.log('— WEAF catalog run completes internally');
const weaf = state.projects.find((p) => p.id === 'p-weaf')!;
const catalogRun = buildRun({
  agentId: 'a-content',
  objective: 'Complete the WEAF catalog',
  kind: 'catalog',
  steps: nba2!.plan.steps, // placeholder, replaced below
  createdBy: 'user',
});
// build with the real catalog plan
import { catalogPlan } from '../lib/atlas/engine';
const catalogRun2 = buildRun({
  agentId: 'a-content',
  objective: 'Complete the WEAF catalog',
  kind: 'catalog',
  steps: catalogPlan(weaf),
  createdBy: 'user',
});
state = attachRun(state, catalogRun2);
ticks = 0;
while (['thinking', 'preparing', 'executing', 'waiting-approval'].includes(liveRun2().status) && ticks < 30) {
  state = tickRuns(state);
  ticks++;
  const r = state.runs.find((x) => x.id === catalogRun2.id)!;
  if (r.status === 'waiting-approval') {
    const ap = state.approvals.find((a) => a.id === r.steps[r.currentStepIndex]?.approvalId)!;
    state = approveApproval(state, ap.id);
  }
}
function liveRun2() {
  return state.runs.find((x) => x.id === catalogRun2.id)!;
}
check('catalog run completes', liveRun2().status === 'completed', liveRun2().status);
const weafAfter = state.projects.find((p) => p.id === 'p-weaf')!;
check('WEAF milestone done', weafAfter.milestones.every((m) => m.status === 'done'));
check('WEAF is now 100%', deriveProjectProgress(weafAfter) === 100);
check('completion toast queued', state.toasts.some((t) => t.tone === 'success' && t.title === 'Run completed'));

console.log('— NBA recomputes after WEAF completes');
const nba3 = deriveNextBestAction(state);
check('NBA no longer catalog', nba3?.kind !== 'catalog', nba3?.kind);

console.log('— intent interpreter');
const i1 = interpretIntent('Launch my new website.', state);
check('launch intent', i1.type === 'launch-project' && i1.goalPreview?.title === 'Launch ORBITA');
check('launch deadline is Oct 14', i1.goalPreview?.deadline?.includes('2026-10-14'), i1.goalPreview?.deadline);
const i2 = interpretIntent('What should I do today?', state);
check('briefing intent', i2.type === 'daily-briefing' && i2.briefing!.priorities.length === 3);
const i3 = interpretIntent('Why am I behind?', state);
check('explain intent', i3.type === 'explain-status' && (i3.answer ?? '').length > 40);
const i4 = interpretIntent('Build a strategy to reach €2,000/month.', state);
check('strategy intent parses €2,000', i4.type === 'build-strategy' && i4.goalPreview?.title.includes('2,000'));
const i5 = interpretIntent('Find opportunities.', state);
check('find-opportunities intent', i5.type === 'find-opportunities' && Boolean(i5.plan));
const i6 = interpretIntent('Analyze my current projects.', state);
check('analyze intent', i6.type === 'analyze-projects' && (i6.answer ?? '').includes('ORBITA'));
const i7 = interpretIntent('Run the SEO agent', state);
check('run-agent intent', i7.type === 'run-agent' && i7.agentId === 'a-seo');
const i8 = interpretIntent('gobbledegook nonsense', state);
check('unknown intent is honest', i8.type === 'unknown');

console.log('— goal creation');
const before = state.goals.length;
const { state: afterCreate, goal } = createGoal(state, {
  title: 'Test goal',
  objective: 'Testing',
  unit: 'currency',
  target: 500,
  deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
  currency: 'EUR',
});
state = afterCreate;
check('goal created', state.goals.length === before + 1 && goal.title === 'Test goal');

console.log('— ambient run');
// Fresh seed: no active runs, SCOUT idle-ish → ambient sweep should start.
const freshState = { ...seedState(), hydrated: true };
const ambient = maybeStartAmbientRun(freshState);
const ambientRun = ambient.runs[0];
check('ambient scout sweep started', ambientRun?.agentId === 'a-scout' && ambientRun?.kind === 'scout-sweep');
let ambientState = ambient;
ticks = 0;
while (['thinking', 'preparing', 'executing'].includes(ambientState.runs[0].status) && ticks < 30) {
  ambientState = tickRuns(ambientState);
  ticks++;
}
check('ambient run completes', ambientState.runs[0].status === 'completed', ambientState.runs[0].status);
// Guard: ambient run must NOT start while an agent run is active.
const busyState = attachRun({ ...seedState(), hydrated: true }, buildRun({
  agentId: 'a-research',
  objective: 'Busy research',
  kind: 'research',
  steps: [{ id: 's1', title: 'Work', status: 'pending', ticks: 5, ticksLeft: 0 }],
  createdBy: 'atlas',
}));
const busyAmbient = maybeStartAmbientRun(busyState);
check('no ambient run while busy', busyAmbient.runs.length === busyState.runs.length);
// Guard: must NOT start while SCOUT is blocked (state used earlier in this test).
const blockedAmbient = maybeStartAmbientRun(state);
check('no ambient run while scout blocked', blockedAmbient.runs.length === state.runs.length);

console.log('— send-approved plan');
const sap = sendApprovedPlan(3);
check('send-approved plan has 3 steps', sap.length === 3);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
