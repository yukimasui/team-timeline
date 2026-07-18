import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CreateTaskInput, CreateTimelineInput, Group, Member, Project, Task, Timeline, UpdateTaskInput } from '@/types';
import { TaskDialog } from './TaskDialog';
import { TimelineDialog } from './TimelineDialog';
import { addDays, dayDiff, memberOf, todayStr } from '@/utils';

interface Props {
  members: Member[];
  projects: Project[];
  groups: Group[];
  tasks: Task[];
  timelines: Timeline[];
  onCreateTask: (data: CreateTaskInput, dependsOn: string[]) => Promise<void>;
  onUpdateTask: (id: string, data: UpdateTaskInput, dependsOn: string[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onCreateTimeline: (data: CreateTimelineInput) => Promise<void>;
  onUpdateTimeline: (id: string, data: CreateTimelineInput) => Promise<void>;
  onDeleteTimeline: (id: string) => Promise<void>;
  onOpenProject: (id: string) => void;
  onOpenGroup: (id: string) => void;
}

const DAY_WIDTH = 32;
const LABEL_WIDTH = 200;
const BAR_HEIGHT = 24;
const LANE_HEIGHT = 36;
const BAR_INSET = (LANE_HEIGHT - BAR_HEIGHT) / 2;
const BOX_PAD = 8;

interface PosItem {
  task: Task;
  startOffset: number;
  span: number;
}

interface Placed extends PosItem {
  lane: number;
}

interface GroupBox {
  groupId: string;
  laneStart: number;
  laneCount: number;
  startOffset: number;
  span: number;
}

function assignLanes(tasks: Task[], rangeStart: string): { placed: Placed[]; groupBoxes: GroupBox[]; laneCount: number } {
  const withPos: PosItem[] = tasks.map((task) => {
    const startOffset = dayDiff(rangeStart, task.start_date);
    const span = Math.max(dayDiff(task.start_date, task.end_date) + 1, 1);
    return { task, startOffset, span };
  });

  const occupied: [number, number][][] = [];
  const isFree = (lane: number, s: number, e: number) => (occupied[lane] ?? []).every(([os, oe]) => e <= os || s >= oe);
  const markOccupied = (lane: number, s: number, e: number) => {
    (occupied[lane] ??= []).push([s, e]);
  };
  const findFreeBlock = (laneCount: number, s: number, e: number) => {
    let lane = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let ok = true;
      for (let i = 0; i < laneCount; i++) {
        if (!isFree(lane + i, s, e)) {
          ok = false;
          break;
        }
      }
      if (ok) return lane;
      lane++;
    }
  };

  const placed: Placed[] = [];
  const groupBoxes: GroupBox[] = [];

  const byGroup = new Map<string, PosItem[]>();
  const ungrouped: PosItem[] = [];
  for (const item of withPos) {
    if (item.task.group_id) {
      const arr = byGroup.get(item.task.group_id) ?? [];
      arr.push(item);
      byGroup.set(item.task.group_id, arr);
    } else {
      ungrouped.push(item);
    }
  }

  const groupEntries = [...byGroup.entries()].sort(
    (a, b) => Math.min(...a[1].map((i) => i.startOffset)) - Math.min(...b[1].map((i) => i.startOffset)),
  );

  for (const [groupId, items] of groupEntries) {
    const sorted = [...items].sort((a, b) => a.startOffset - b.startOffset);
    const laneEnds: number[] = [];
    const relLane = new Map<PosItem, number>();
    for (const item of sorted) {
      const s = item.startOffset;
      const e = item.startOffset + item.span;
      let lane = laneEnds.findIndex((end) => end <= s);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(e);
      } else {
        laneEnds[lane] = e;
      }
      relLane.set(item, lane);
    }
    const laneCount = laneEnds.length;
    const groupStart = Math.min(...items.map((i) => i.startOffset));
    const groupEnd = Math.max(...items.map((i) => i.startOffset + i.span));
    const baseLane = findFreeBlock(laneCount, groupStart, groupEnd);

    for (const item of sorted) {
      placed.push({ ...item, lane: baseLane + (relLane.get(item) ?? 0) });
    }
    for (let i = 0; i < laneCount; i++) markOccupied(baseLane + i, groupStart, groupEnd);
    groupBoxes.push({ groupId, laneStart: baseLane, laneCount, startOffset: groupStart, span: groupEnd - groupStart });
  }

  const sortedUngrouped = [...ungrouped].sort((a, b) => a.startOffset - b.startOffset);
  for (const item of sortedUngrouped) {
    const s = item.startOffset;
    const e = item.startOffset + item.span;
    const lane = findFreeBlock(1, s, e);
    placed.push({ ...item, lane });
    markOccupied(lane, s, e);
  }

  const laneCount = Math.max(1, ...placed.map((p) => p.lane + 1));
  return { placed, groupBoxes, laneCount };
}

function groupConsecutive(days: string[], keyFn: (d: string) => string): { key: string; count: number }[] {
  const result: { key: string; count: number }[] = [];
  for (const d of days) {
    const key = keyFn(d);
    const last = result[result.length - 1];
    if (last && last.key === key) {
      last.count++;
    } else {
      result.push({ key, count: 1 });
    }
  }
  return result;
}

function dayColorClass(d: string): string {
  const dow = new Date(d).getDay();
  if (dow === 0) return 'text-red-500';
  if (dow === 6) return 'text-blue-500';
  return 'text-muted-foreground';
}

function barStyle(status: Task['status'], color: string): React.CSSProperties {
  if (status === 'done') {
    return { backgroundColor: '#9ca3af', border: `2px solid ${color}`, color: '#1f2937' };
  }
  if (status === 'todo') {
    return { backgroundColor: color, opacity: 0.55, color: 'white' };
  }
  return { backgroundColor: color, color: 'white' };
}

export function TimelineView({
  members,
  projects,
  groups,
  tasks,
  timelines,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreateTimeline,
  onUpdateTimeline,
  onDeleteTimeline,
  onOpenProject,
  onOpenGroup,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [clickAdd, setClickAdd] = useState<{ projectId: string; date: string } | null>(null);

  const activeTimeline = timelines.find((t) => t.id === activeTimelineId);
  const visibleProjects = activeTimeline ? projects.filter((p) => activeTimeline.project_ids.includes(p.id)) : projects;

  // 現状はタスクの有無にかかわらず2026年通年を基準表示にする(将来的に可変レンジ化する想定)
  const YEAR_START = '2026-01-01';
  const YEAR_END = '2027-01-01';
  const starts = tasks.map((t) => t.start_date);
  const ends = tasks.map((t) => t.end_date);
  const rangeStart = starts.length > 0 ? [YEAR_START, ...starts].reduce((a, b) => (a < b ? a : b)) : YEAR_START;
  const rangeEndRaw = ends.length > 0 ? ends.reduce((a, b) => (a > b ? a : b)) : YEAR_START;
  const rangeEnd = [YEAR_END, addDays(rangeEndRaw, 1)].reduce((a, b) => (a > b ? a : b));
  const totalDays = Math.max(dayDiff(rangeStart, rangeEnd), 1);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i)), [totalDays, rangeStart]);
  const gridWidth = totalDays * DAY_WIDTH;
  const yearGroups = useMemo(() => groupConsecutive(days, (d) => d.slice(0, 4)), [days]);
  const monthGroups = useMemo(() => groupConsecutive(days, (d) => d.slice(0, 7)), [days]);

  const today = todayStr();
  const todayOffset = dayDiff(rangeStart, today);
  const todayInRange = todayOffset >= 0 && todayOffset < totalDays;

  function jumpToToday() {
    const el = scrollRef.current;
    if (!el || !todayInRange) return;
    el.scrollLeft = Math.max(0, todayOffset * DAY_WIDTH - el.clientWidth / 2 + LABEL_WIDTH / 2 + DAY_WIDTH / 2);
  }

  function handleRowClick(e: React.MouseEvent<HTMLDivElement>, projectId: string) {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dayIndex = Math.max(0, Math.floor((e.clientX - rect.left) / DAY_WIDTH));
    setClickAdd({ projectId, date: addDays(rangeStart, dayIndex) });
  }

  const tabClass = (isActive: boolean) =>
    `shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      isActive ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-md bg-muted/30 p-1">
          <button type="button" onClick={() => setActiveTimelineId(null)} className={tabClass(!activeTimeline)}>
            全体
          </button>
          {timelines.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTimelineId(t.id)}
              className={tabClass(activeTimeline?.id === t.id)}
            >
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
                setActiveTimelineId(null);
              }}
              trigger={
                <button type="button" className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                  編集
                </button>
              }
            />
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={jumpToToday} disabled={!todayInRange} className="shrink-0">
          今日
        </Button>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
          <p>プロジェクト・タスクを追加するとタイムラインが表示されるにゃ</p>
        </div>
      ) : (
        <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: '70vh' }}>
          <div style={{ width: LABEL_WIDTH + gridWidth }}>
            <div className="sticky top-0 z-30 flex border-b bg-background">
              <div
                className="sticky left-0 z-40 flex shrink-0 items-end border-r bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                style={{ width: LABEL_WIDTH }}
              >
                プロジェクト
              </div>
              <div className="flex flex-col bg-muted">
                <div className="flex border-b border-border/60">
                  {yearGroups.map((g, i) => (
                    <div
                      key={i}
                      className="flex shrink-0 items-center justify-center border-r py-0.5 text-[11px] font-medium text-muted-foreground"
                      style={{ width: g.count * DAY_WIDTH }}
                    >
                      {g.key}年
                    </div>
                  ))}
                </div>
                <div className="flex border-b border-border/60">
                  {monthGroups.map((g, i) => (
                    <div
                      key={i}
                      className="flex shrink-0 items-center justify-center border-r py-0.5 text-[11px] text-muted-foreground"
                      style={{ width: g.count * DAY_WIDTH }}
                    >
                      {parseInt(g.key.slice(5, 7), 10)}月
                    </div>
                  ))}
                </div>
                <div className="relative flex">
                  {todayInRange && (
                    <div
                      className="absolute top-0 h-full bg-amber-400/20"
                      style={{ left: todayOffset * DAY_WIDTH, width: DAY_WIDTH }}
                    />
                  )}
                  {days.map((d) => (
                    <div
                      key={d}
                      className={`flex w-8 shrink-0 items-center justify-center border-r py-1 text-xs last:border-r-0 ${
                        d === today ? 'font-semibold text-foreground' : dayColorClass(d)
                      }`}
                    >
                      {parseInt(d.slice(8, 10), 10)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {visibleProjects.map((project) => {
              const projectTasks = tasks.filter((t) => t.project_id === project.id);
              const { placed, groupBoxes, laneCount } = assignLanes(projectTasks, rangeStart);
              const hasGroups = groupBoxes.length > 0;
              const topPad = hasGroups ? 26 : 8;
              const rowHeight = topPad + laneCount * LANE_HEIGHT + (hasGroups ? BOX_PAD : 0) + 8;

              return (
                <div key={project.id} className="flex border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onOpenProject(project.id)}
                    className="sticky left-0 z-20 flex shrink-0 items-start gap-2 border-r bg-background px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                    <span className="truncate">{project.name}</span>
                  </button>
                  <div
                    className="relative cursor-crosshair"
                    style={{ width: gridWidth, height: rowHeight }}
                    onClick={(e) => handleRowClick(e, project.id)}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${DAY_WIDTH - 1}px, var(--border) ${DAY_WIDTH - 1}px, var(--border) ${DAY_WIDTH}px)`,
                      }}
                    />
                    {todayInRange && (
                      <div
                        className="absolute top-0 h-full bg-amber-400/10"
                        style={{ left: todayOffset * DAY_WIDTH, width: DAY_WIDTH }}
                      />
                    )}

                    {groupBoxes.map((box) => {
                      const group = groups.find((g) => g.id === box.groupId);
                      if (!group) return null;
                      const left = box.startOffset * DAY_WIDTH - 6;
                      const top = topPad + box.laneStart * LANE_HEIGHT + BAR_INSET - BOX_PAD;
                      const width = box.span * DAY_WIDTH + 12;
                      const height = (box.laneCount - 1) * LANE_HEIGHT + BAR_HEIGHT + BOX_PAD * 2;
                      return (
                        <div key={box.groupId}>
                          <div
                            className="absolute z-[2] rounded-lg border-2"
                            style={{
                              left,
                              top,
                              width,
                              height,
                              borderColor: group.color,
                              backgroundColor: `${group.color}1a`,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => onOpenGroup(group.id)}
                            className="absolute z-[3] truncate rounded px-1.5 text-[10px] font-medium text-white shadow-sm hover:opacity-90"
                            style={{ left, top: top - 14, maxWidth: width, backgroundColor: group.color }}
                          >
                            {group.name}
                          </button>
                        </div>
                      );
                    })}

                    {placed.map(({ task: t, lane, startOffset, span }) => {
                      const member = memberOf(members, t.member_id);
                      const group = t.group_id ? groups.find((g) => g.id === t.group_id) : undefined;
                      const color = member?.color ?? '#6366f1';
                      return (
                        <TaskDialog
                          key={t.id}
                          members={members}
                          projects={projects}
                          groups={groups}
                          tasks={tasks}
                          task={t}
                          onSubmit={(data, dependsOn) => onUpdateTask(t.id, data, dependsOn)}
                          onDelete={() => onDeleteTask(t.id)}
                          trigger={
                            <button
                              type="button"
                              className="absolute z-10 flex items-center overflow-hidden rounded-md px-2 text-left text-xs shadow-sm transition-opacity hover:opacity-90"
                              style={{
                                left: startOffset * DAY_WIDTH + 2,
                                width: span * DAY_WIDTH - 4,
                                top: topPad + lane * LANE_HEIGHT + BAR_INSET,
                                height: BAR_HEIGHT,
                                ...barStyle(t.status, color),
                              }}
                              title={`${t.title}${group ? ` / ${group.name}` : ''}`}
                            >
                              <span className="truncate">{t.title}</span>
                            </button>
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {clickAdd && (
        <TaskDialog
          members={members}
          projects={projects}
          groups={groups}
          tasks={tasks}
          defaultProjectId={clickAdd.projectId}
          defaultStartDate={clickAdd.date}
          defaultEndDate={clickAdd.date}
          open={Boolean(clickAdd)}
          onOpenChange={(o) => !o && setClickAdd(null)}
          onSubmit={(data, dependsOn) => onCreateTask(data as CreateTaskInput, dependsOn)}
        />
      )}
    </div>
  );
}
