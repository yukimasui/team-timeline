import type { CreateTimelineInput, Project, Timeline } from '@/types';
import { TimelineDialog } from './TimelineDialog';

interface Props {
  projects: Project[];
  timelines: Timeline[];
  activeTimelineId: string | null;
  onSelect: (id: string | null) => void;
  onCreateTimeline: (data: CreateTimelineInput) => Promise<void>;
  onUpdateTimeline: (id: string, data: CreateTimelineInput) => Promise<void>;
  onDeleteTimeline: (id: string) => Promise<void>;
}

const tabClass = (isActive: boolean) =>
  `shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
    isActive ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
  }`;

export function TimelineTabs({
  projects,
  timelines,
  activeTimelineId,
  onSelect,
  onCreateTimeline,
  onUpdateTimeline,
  onDeleteTimeline,
}: Props) {
  const activeTimeline = timelines.find((t) => t.id === activeTimelineId);

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-md bg-muted/30 p-1">
      <button type="button" onClick={() => onSelect(null)} className={tabClass(!activeTimeline)}>
        全体
      </button>
      {timelines.map((t) => (
        <button key={t.id} type="button" onClick={() => onSelect(t.id)} className={tabClass(activeTimeline?.id === t.id)}>
          {t.name}
        </button>
      ))}
      <TimelineDialog
        projects={projects}
        onSubmit={onCreateTimeline}
        trigger={
          <button type="button" className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
            +
          </button>
        }
      />
      {activeTimeline && (
        <TimelineDialog
          projects={projects}
          timeline={activeTimeline}
          onSubmit={(data) => onUpdateTimeline(activeTimeline.id, data)}
          onDelete={async () => {
            await onDeleteTimeline(activeTimeline.id);
            onSelect(null);
          }}
          trigger={
            <button type="button" className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              編集
            </button>
          }
        />
      )}
    </div>
  );
}
