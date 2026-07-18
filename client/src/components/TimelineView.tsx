import type { CreateTaskInput, Member, Task, UpdateTaskInput } from '@/types';
import { TaskDialog } from './TaskDialog';
import { addDays, dayDiff, formatShort, STATUS_LABEL } from '@/utils';

interface Props {
  members: Member[];
  tasks: Task[];
  onCreateTask: (data: CreateTaskInput, dependsOn: string[]) => Promise<void>;
  onUpdateTask: (id: string, data: UpdateTaskInput, dependsOn: string[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

const DAY_WIDTH = 32;

export function TimelineView({ members, tasks, onCreateTask, onUpdateTask, onDeleteTask }: Props) {
  if (tasks.length === 0 || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
        <p>メンバーとタスクを追加するとタイムラインが表示されるにゃ</p>
      </div>
    );
  }

  const starts = tasks.map((t) => t.start_date);
  const ends = tasks.map((t) => t.end_date);
  const rangeStart = starts.reduce((a, b) => (a < b ? a : b));
  const rangeEndRaw = ends.reduce((a, b) => (a > b ? a : b));
  const rangeEnd = addDays(rangeEndRaw, 1);
  const totalDays = Math.max(dayDiff(rangeStart, rangeEnd), 1);

  const days = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div style={{ width: 180 + totalDays * DAY_WIDTH }}>
        {/* 日付ヘッダー */}
        <div className="flex border-b bg-muted/40 text-xs text-muted-foreground">
          <div className="w-[180px] shrink-0 border-r px-3 py-2 font-medium">メンバー</div>
          <div className="flex">
            {days.map((d) => (
              <div key={d} className="flex w-8 shrink-0 items-center justify-center border-r py-2 last:border-r-0">
                {formatShort(d)}
              </div>
            ))}
          </div>
        </div>

        {/* メンバー行 */}
        {members.map((m) => {
          const memberTasks = tasks.filter((t) => t.member_id === m.id);
          return (
            <div key={m.id} className="flex border-b last:border-b-0">
              <div className="flex w-[180px] shrink-0 items-center gap-2 border-r px-3 py-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="truncate text-sm font-medium">{m.name}</span>
              </div>
              <div className="relative flex-1" style={{ minHeight: 48, width: totalDays * DAY_WIDTH }}>
                {days.map((d, i) => (
                  <div
                    key={d}
                    className="absolute top-0 h-full border-r border-border/50"
                    style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                  />
                ))}
                {memberTasks.map((t, rowIdx) => {
                  const offset = dayDiff(rangeStart, t.start_date);
                  const span = Math.max(dayDiff(t.start_date, t.end_date) + 1, 1);
                  return (
                    <TaskDialog
                      key={t.id}
                      members={members}
                      tasks={tasks}
                      task={t}
                      onSubmit={(data, dependsOn) => onUpdateTask(t.id, data, dependsOn)}
                      onDelete={() => onDeleteTask(t.id)}
                      trigger={
                        <button
                          type="button"
                          className="absolute flex items-center overflow-hidden rounded-md px-2 text-left text-xs text-white shadow-sm transition-opacity hover:opacity-90"
                          style={{
                            left: offset * DAY_WIDTH + 2,
                            width: span * DAY_WIDTH - 4,
                            top: 6 + rowIdx * 28,
                            height: 24,
                            backgroundColor: m.color,
                            opacity: t.status === 'done' ? 0.5 : 1,
                          }}
                          title={`${t.title}(${STATUS_LABEL[t.status]})`}
                        >
                          <span className="truncate">{t.title}</span>
                        </button>
                      }
                    />
                  );
                })}
                <div style={{ height: Math.max(memberTasks.length, 1) * 28 + 12 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t p-2">
        <TaskDialog
          members={members}
          tasks={tasks}
          onSubmit={(data, dependsOn) => onCreateTask(data as CreateTaskInput, dependsOn)}
          trigger={
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground">
              + タスクを追加
            </button>
          }
        />
      </div>
    </div>
  );
}
