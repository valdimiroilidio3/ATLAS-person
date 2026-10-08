'use client';

// PROJECTS — spec §08. Project management that doesn't feel like PM software.
// Progress is always derived from structured milestone state.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FolderGit2 } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import { catalogPlan, deployPlan, deriveProjectProgress } from '@/lib/atlas/engine';
import { PROJECT_STATUS_META } from '@/lib/atlas/constants';
import { formatDate } from '@/lib/atlas/format';
import type { Project } from '@/lib/atlas/types';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { ProjectDetailSheet } from '@/components/projects/project-detail-sheet';

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (p: Project) => void }) {
  const { openExecutionPreview } = useAtlas();
  const progress = deriveProjectProgress(project);
  const meta = PROJECT_STATUS_META[project.status];
  const activeMilestone = project.milestones.find((m) => m.status === 'active');

  const handlePrimary = () => {
    if (project.id === 'p-orbita') {
      openExecutionPreview({
        agentId: 'a-execution',
        objective: project.status === 'blocked' ? 'Resolve the ORBITA deployment blocker' : 'Prepare and deploy ORBITA',
        kind: 'deploy',
        steps: deployPlan(project),
        linkedProjectId: project.id,
      });
    } else if (project.id === 'p-weaf' && activeMilestone) {
      openExecutionPreview({
        agentId: 'a-content',
        objective: 'Complete the WEAF catalog',
        kind: 'catalog',
        steps: catalogPlan(project),
        linkedProjectId: project.id,
      });
    } else {
      onOpen(project);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="surface p-5 sm:p-6 flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Project</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">{project.name}</h3>
        </div>
        <Badge tone={meta.tone} pulse={project.status === 'active'}>
          {meta.label}
        </Badge>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text-2">{project.objective}</p>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-text-3">
            {project.milestones.filter((m) => m.status === 'done').length}/{project.milestones.length} milestones
          </span>
          <span className="font-mono tabular text-text-2">{progress}%</span>
        </div>
        <ProgressBar value={progress} tone={project.status === 'blocked' ? 'error' : 'accent'} height={8} />
      </div>

      {project.blockers.length > 0 && (
        <div className="mt-4 rounded-lg border border-error/25 bg-error/[0.05] px-3.5 py-2.5">
          <p className="text-xs font-medium text-error">Blocked · {project.blockers[0].title}</p>
          <p className="mt-0.5 text-xs text-text-2">{project.blockers[0].reason}</p>
        </div>
      )}

      {activeMilestone && !project.blockers.length && (
        <p className="mt-4 text-xs text-text-3">
          In progress · {activeMilestone.title}
        </p>
      )}

      <div className="mt-auto hairline pt-5 flex items-center justify-between">
        <div className="text-xs text-text-3">
          {project.deadline && <span>Due {formatDate(project.deadline)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpen(project)}>
            Details
          </Button>
          <Button variant="subtle" size="sm" onClick={handlePrimary}>
            {project.id === 'p-scout' ? 'Contact leads' : project.status === 'blocked' ? 'Resolve' : 'Advance'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export default function ProjectsPage() {
  const { state } = useAtlas();
  const [selected, setSelected] = useState<Project | null>(null);

  return (
    <div className="py-8 space-y-8">
      <SectionHeader
        eyebrow="Projects"
        title="Projects"
        description="ORBITA, SCOUT and WEAF — measured by milestones, not vibes."
      />

      {state.projects.length === 0 ? (
        <Surface padding={false}>
          <EmptyState
            icon={FolderGit2}
            title="No projects yet"
            description="Projects are where goals become shipped work. Create a goal first, then break it into a project."
          />
        </Surface>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.projects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={setSelected} />
          ))}
        </div>
      )}

      <ProjectDetailSheet project={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
