'use client';

// Create Goal modal — a real form with real state (spec §32).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import type { Goal } from '@/lib/atlas/types';
import { Modal, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/inputs';

const DEFAULT_DEADLINE = () => {
  const d = new Date(Date.now() + 90 * 86400000);
  return d.toISOString().slice(0, 10);
};

export default function CreateGoalModal() {
  const router = useRouter();
  const { ui, closeCreateGoal, createGoal } = useAtlas();

  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [unit, setUnit] = useState<Goal['unit']>('currency');
  const [target, setTarget] = useState('1000');
  const [deadline, setDeadline] = useState(DEFAULT_DEADLINE);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle('');
    setObjective('');
    setUnit('currency');
    setTarget('1000');
    setDeadline(DEFAULT_DEADLINE());
    setError(null);
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError('Give the goal a title.');
      return;
    }
    const value = Number(target);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Target must be a positive number.');
      return;
    }
    if (!deadline) {
      setError('Pick a deadline.');
      return;
    }
    createGoal({
      title: title.trim(),
      objective: objective.trim() || title.trim(),
      unit,
      target: value,
      deadline: new Date(deadline).toISOString(),
      currency: unit === 'currency' ? 'EUR' : undefined,
    });
    reset();
    closeCreateGoal();
    router.push('/goals');
  }

  return (
    <Modal open={ui.createGoalOpen} onClose={closeCreateGoal} maxWidth="max-w-lg" labelledBy="create-goal-title">
      <ModalHeader
        eyebrow="Goal operating system"
        title="Create a goal"
        description="ATLAS structures the strategy, milestones and next actions around it."
        onClose={closeCreateGoal}
      />
      <div className="space-y-4 px-6 py-5">
        <Field label="Goal title" hint="What are you optimizing for?">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="€1,000 monthly revenue"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </Field>
        <Field label="Objective" hint="One sentence is enough.">
          <Textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Reach €1,000 in monthly recurring revenue from premium websites and AI automation."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit">
            <Select value={unit} onChange={(e) => setUnit(e.target.value as Goal['unit'])}>
              <option value="currency">Currency (€)</option>
              <option value="count">Count</option>
              <option value="percent">Percent</option>
            </Select>
          </Field>
          <Field label="Target">
            <Input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="1000" />
          </Field>
        </div>
        <Field label="Deadline">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        {error && (
          <p className="rounded-lg border border-error/30 bg-error/[0.07] px-3 py-2 text-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={closeCreateGoal}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          <Target className="h-3.5 w-3.5" /> Create goal
        </Button>
      </ModalFooter>
    </Modal>
  );
}
