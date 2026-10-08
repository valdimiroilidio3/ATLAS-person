'use client';

// MEMORY — spec §13. Persistent contextual memory. Invisible, but visible here.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Plus, Trash2 } from 'lucide-react';
import { MEMORY_CATEGORIES } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { formatDate, isToday } from '@/lib/atlas/format';
import type { MemoryCategory } from '@/lib/atlas/types';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select } from '@/components/ui/inputs';
import { t } from '@/lib/i18n';

export default function MemoryPage() {
  const { state, addMemory, deleteMemory } = useAtlas();
  const [category, setCategory] = useState<MemoryCategory>('context');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (!value.trim()) return;
    addMemory(category, key.trim() || 'Note', value.trim());
    setKey('');
    setValue('');
  };

  return (
    <div className="py-8 space-y-8">
      <SectionHeader
        eyebrow={t('Persistent context')}
        title={t('Memory')}
        description={t('What ATLAS remembers about you. It improves recommendations — it never exposes complexity.')}
      />

      {/* Quick add */}
      <Surface>
        <p className="eyebrow mb-3">{t('Add a memory')}</p>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_2fr] sm:items-center">
          <Select value={category} onChange={(e) => setCategory(e.target.value as MemoryCategory)} aria-label={t('Memory category')}>
            {MEMORY_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.labelKey)}
              </option>
            ))}
          </Select>
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder={t('Key · e.g. Positioning')} />
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('What should ATLAS remember?')}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button variant="primary" size="md" onClick={handleAdd} disabled={!value.trim()}>
              <Plus className="h-3.5 w-3.5" /> {t('Save')}
            </Button>
          </div>
        </div>
      </Surface>

      {state.memories.length === 0 ? (
        <Surface padding={false}>
          <EmptyState
            icon={Brain}
            title={t('Nothing remembered yet')}
            description={t('Add a preference, a decision or an important fact — ATLAS will use it to improve recommendations.')}
          />
        </Surface>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {MEMORY_CATEGORIES.map((cat, catIndex) => {
            const entries = state.memories.filter((m) => m.category === cat.id);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: catIndex * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <Surface className="h-full flex flex-col">
                  <div className="mb-3 flex items-baseline justify-between">
                    <div>
                      <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-2">{t(cat.labelKey)}</h3>
                      <p className="mt-0.5 text-xs text-text-3">{t(cat.descriptionKey)}</p>
                    </div>
                    <span className="font-mono text-xs tabular text-text-3">{entries.length}</span>
                  </div>
                  {entries.length === 0 ? (
                    <p className="text-sm text-text-3">{t('Nothing here yet.')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {entries.map((m) => (
                        <li
                          key={m.id}
                          className="group flex items-start justify-between gap-3 rounded-lg border border-border bg-surface2 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-text-2">{m.key}</p>
                            <p className="mt-0.5 text-sm text-text">{m.value}</p>
                            <p className="mt-1 font-mono text-[10px] text-text-3">{t('updated')} {isToday(m.updatedAt) ? 'today' : formatDate(m.updatedAt)}</p>
                          </div>
                          <button
                            onClick={() => deleteMemory(m.id)}
                            aria-label={`Delete memory ${m.key}`}
                            className="shrink-0 rounded-md p-1 text-text-3 opacity-0 transition-opacity hover:bg-error/10 hover:text-error group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Surface>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
