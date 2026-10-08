'use client';

// ATLAS store — the single source of truth.
//
// A clean data layer (spec §17): components never talk to mock data
// directly. They call actions here; the engine computes the next state.
// The whole state persists to localStorage so the product survives reloads,
// and every slice can later be swapped for a real API without touching UI.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ApprovalLevel,
  AtlasState,
  Currency,
  Goal,
  MemoryCategory,
  Preferences,
  UserProfile,
} from './types';
import { seedState } from './seed';
import {
  addMemoryEntry,
  agentPlan,
  approveApproval,
  attachRun,
  buildRun,
  createGoal as engineCreateGoal,
  deriveNextBestAction,
  dismissExpiredToasts,
  dismissToast,
  interpretIntent,
  maybeStartAmbientRun,
  rejectApproval,
  tickRuns,
  uid,
  type CreateGoalInput,
  type InterpretedIntent,
  type NextBestAction,
  type RunSpec,
} from './engine';

const STORAGE_KEY = 'atlas-state-v1';

export interface ExecutionPlanPreview {
  agentId: string;
  objective: string;
  kind: RunSpec['kind'];
  steps: RunSpec['steps'];
  linkedGoalId?: string;
  linkedProjectId?: string;
  linkedOpportunityIds?: string[];
}

interface AtlasUIState {
  commandPaletteOpen: boolean;
  approvalCenterOpen: boolean;
  createGoalOpen: boolean;
  executionFlow: { open: boolean; plan?: ExecutionPlanPreview; runId?: string };
}

interface AtlasContextValue {
  state: AtlasState;
  hydrated: boolean;
  ui: AtlasUIState;

  // global UI
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openApprovalCenter: () => void;
  closeApprovalCenter: () => void;
  openCreateGoal: () => void;
  closeCreateGoal: () => void;
  openExecutionPreview: (plan: ExecutionPlanPreview) => void;
  openExecutionRun: (runId: string) => void;
  closeExecutionFlow: () => void;

  // feedback
  toast: (title: string, body?: string, tone?: 'info' | 'success' | 'warning' | 'error', persistent?: boolean) => void;
  dismissToast: (id: string) => void;

  // execution
  startRun: (spec: ExecutionPlanPreview) => string;
  startNextBestAction: () => { runId: string; nba: NextBestAction } | null;
  runAgent: (agentId: string, objective: string) => string;

  // approvals
  approve: (approvalId: string) => void;
  reject: (approvalId: string, reason?: string) => void;

  // intelligence
  interpret: (input: string) => InterpretedIntent;
  nextBestAction: () => NextBestAction | null;

  // data
  createGoal: (input: CreateGoalInput) => string;
  addMemory: (category: MemoryCategory, key: string, value: string) => void;
  deleteMemory: (id: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updatePreferences: (patch: Partial<Preferences>) => void;
  resetDemoData: () => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);

const initialUI: AtlasUIState = {
  commandPaletteOpen: false,
  approvalCenterOpen: false,
  createGoalOpen: false,
  executionFlow: { open: false },
};

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AtlasState>(() => seedState());
  const [ui, setUI] = useState<AtlasUIState>(initialUI);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ---- hydration from localStorage -------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AtlasState>;
        setState((s) => ({ ...s, ...parsed, toasts: [], hydrated: true }));
        return;
      }
    } catch {
      // Corrupted state — fall back to the seed.
    }
    setState((s) => ({ ...s, hydrated: true }));
  }, []);

  // ---- persistence ------------------------------------------------------
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      const { toasts: _toasts, hydrated: _hydrated, ...rest } = state;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {
      // Storage full or unavailable — the app still works in memory.
    }
  }, [state]);

  // ---- run engine clock --------------------------------------------------
  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((s) => (s.hydrated ? tickRuns(s) : s));
    }, 1100);
    return () => window.clearInterval(timer);
  }, []);

  // ---- ambient life: a background sweep when the system is idle ----------
  useEffect(() => {
    if (!state.hydrated) return;
    const timer = window.setTimeout(() => {
      setState((s) => maybeStartAmbientRun(s));
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [state.hydrated]);

  // ---- toast expiry -------------------------------------------------------
  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((s) => dismissExpiredToasts(s));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // ---- global keyboard: CMD/CTRL + K --------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setUI((u) => ({ ...u, commandPaletteOpen: !u.commandPaletteOpen }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ---- actions ------------------------------------------------------------

  const toast = useCallback(
    (title: string, body?: string, tone: 'info' | 'success' | 'warning' | 'error' = 'info', persistent = false) => {
      const id = uid('toast');
      setState((s) => ({
        ...s,
        toasts: [...s.toasts, { id, title, body, tone, createdAt: new Date().toISOString(), persistent }],
      }));
    },
    [],
  );

  const startRun = useCallback((spec: ExecutionPlanPreview): string => {
    const run = buildRun({ ...spec, createdBy: 'user' });
    setState((s) => attachRun(s, run));
    return run.id;
  }, []);

  const startNextBestAction = useCallback((): { runId: string; nba: NextBestAction } | null => {
    const nba = deriveNextBestAction(stateRef.current);
    if (!nba) return null;
    const run = buildRun({ ...nba.plan, createdBy: 'user' });
    setState((s) => attachRun(s, run));
    return { runId: run.id, nba };
  }, []);

  const runAgent = useCallback((agentId: string, objective: string): string => {
    const s = stateRef.current;
    const agent = s.agents.find((a) => a.id === agentId);
    const objective_ = objective.trim() || `${agent?.name ?? 'Agent'} — ad-hoc task`;
    const kind =
      agentId === 'a-scout'
        ? ('scout-sweep' as const)
        : agentId === 'a-research'
          ? ('research' as const)
          : agentId === 'a-content'
            ? ('content' as const)
            : agentId === 'a-seo'
              ? ('seo-audit' as const)
              : ('generic' as const);
    const run = buildRun({
      agentId,
      objective: objective_,
      kind,
      steps: agentPlan(agentId, objective_, s),
      createdBy: 'user',
    });
    setState((st) => attachRun(st, run));
    return run.id;
  }, []);

  const approve = useCallback((approvalId: string) => {
    setState((s) => approveApproval(s, approvalId));
  }, []);

  const reject = useCallback((approvalId: string, reason?: string) => {
    setState((s) => rejectApproval(s, approvalId, reason));
  }, []);

  const interpret = useCallback((input: string) => interpretIntent(input, stateRef.current), []);

  const nextBestAction = useCallback(() => deriveNextBestAction(stateRef.current), []);

  const createGoal = useCallback((input: CreateGoalInput): string => {
    let goalId = '';
    setState((s) => {
      const result = engineCreateGoal(s, input);
      goalId = result.goal.id;
      return result.state;
    });
    return goalId;
  }, []);

  const addMemory = useCallback((category: MemoryCategory, key: string, value: string) => {
    setState((s) => addMemoryEntry(s, category, key, value));
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setState((s) => ({ ...s, memories: s.memories.filter((m) => m.id !== id) }));
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setState((s) => ({ ...s, user: { ...s.user, ...patch } }));
  }, []);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setState((s) => ({ ...s, preferences: { ...s.preferences, ...patch } }));
  }, []);

  const resetDemoData = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState({ ...seedState(), hydrated: true });
    setUI(initialUI);
  }, []);

  // ---- global UI actions ----------------------------------------------------

  const openCommandPalette = useCallback(() => setUI((u) => ({ ...u, commandPaletteOpen: true })), []);
  const closeCommandPalette = useCallback(() => setUI((u) => ({ ...u, commandPaletteOpen: false })), []);
  const toggleCommandPalette = useCallback(
    () => setUI((u) => ({ ...u, commandPaletteOpen: !u.commandPaletteOpen })),
    [],
  );
  const openApprovalCenter = useCallback(() => setUI((u) => ({ ...u, approvalCenterOpen: true })), []);
  const closeApprovalCenter = useCallback(() => setUI((u) => ({ ...u, approvalCenterOpen: false })), []);
  const openCreateGoal = useCallback(() => setUI((u) => ({ ...u, createGoalOpen: true })), []);
  const closeCreateGoal = useCallback(() => setUI((u) => ({ ...u, createGoalOpen: false })), []);
  const openExecutionPreview = useCallback(
    (plan: ExecutionPlanPreview) => setUI((u) => ({ ...u, executionFlow: { open: true, plan } })),
    [],
  );
  const openExecutionRun = useCallback(
    (runId: string) => setUI((u) => ({ ...u, executionFlow: { open: true, runId } })),
    [],
  );
  const closeExecutionFlow = useCallback(
    () => setUI((u) => ({ ...u, executionFlow: { open: false } })),
    [],
  );

  const value = useMemo<AtlasContextValue>(
    () => ({
      state,
      hydrated: state.hydrated,
      ui,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      openApprovalCenter,
      closeApprovalCenter,
      openCreateGoal,
      closeCreateGoal,
      openExecutionPreview,
      openExecutionRun,
      closeExecutionFlow,
      toast,
      dismissToast: (id) => setState((s) => dismissToast(s, id)),
      startRun,
      startNextBestAction,
      runAgent,
      approve,
      reject,
      interpret,
      nextBestAction,
      createGoal,
      addMemory,
      deleteMemory,
      updateProfile,
      updatePreferences,
      resetDemoData,
    }),
    [
      state,
      ui,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      openApprovalCenter,
      closeApprovalCenter,
      openCreateGoal,
      closeCreateGoal,
      openExecutionPreview,
      openExecutionRun,
      closeExecutionFlow,
      toast,
      startRun,
      startNextBestAction,
      runAgent,
      approve,
      reject,
      interpret,
      nextBestAction,
      createGoal,
      addMemory,
      deleteMemory,
      updateProfile,
      updatePreferences,
      resetDemoData,
    ],
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas(): AtlasContextValue {
  const ctx = useContext(AtlasContext);
  if (!ctx) throw new Error('useAtlas must be used within AtlasProvider');
  return ctx;
}

// Re-export commonly used types for components.
export type { Goal, Currency, ApprovalLevel };
