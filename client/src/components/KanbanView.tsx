import { useState } from 'react';
import type { CreateTaskInput, Member, Status, Task, UpdateTaskInput } from '@/types';
import { TaskDialog } from './TaskDialog';
import { memberOf, STATUS_LABEL, STATUS_ORDER } from '@/utils';

interface Props {
  members: Member[];
  tasks: Task[];
  onCreateTask: (data: CreateTaskInput, dependsOn: string[]) => Promise<void>;
  onUpdateTask: (id: string, data: UpdateTaskInput, dependsOn: string[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export function KanbanView({ members, tasks, onCreateTask, onUpdateTask, onDeleteTask }: Props) {
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);

  async function handleDrop(status: Status, e: React.DragEvent) {
    e.preventDefault();
    setDragOverStatus(null);
    const taskId = e.dataTransfer.getData('text/task-id');
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    await onUpdateTask(task.id, { status }, task.depends_on);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(status, e)}
            className={`flex min-h-[240px] flex-col gap-2 rounded-lg border p-3 transition-colors ${
              dragOverStatus === status ? 'bg-muted/60' : 'bg-muted/20'
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{STATUS_LABEL[status]}</h3>
              <span className="text-xs text-muted-foreground">{columnTasks.length}</span>
            </div>

            {columnTasks.map((t) => {
              const member = memberOf(members, t.member_id);
              return (
                <TaskDialog
                  key={t.id}
                  members={members}
                  tasks={tasks}
                  task={t}
                  onSubmit={(data, dependsOn) => onUpdateTask(t.id, data, dependsOn)}
                  onDelete={() => onDeleteTask(t.id)}
                  trigger={
                    <div
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/task-id', t.id)}
                      className="cursor-pointer rounded-md border bg-background p-3 text-left shadow-sm hover:shadow"
                    >
                      <p className="text-sm font-medium">{t.title}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: member?.color }} />
                          {member?.name}
                        </span>
                        <span>
                          {t.start_date.slice(5)} 〜 {t.end_date.slice(5)}
                        </span>
                      </div>
                    </div>
                  }
                />
              );
            })}

            <TaskDialog
              members={members}
              tasks={tasks}
              onSubmit={(data, dependsOn) =>
                onCreateTask({ ...(data as CreateTaskInput), status }, dependsOn)
              }
              trigger={
                <button type="button" className="mt-auto rounded-md border border-dashed p-2 text-xs text-muted-foreground hover:text-foreground">
                  + タスクを追加
                </button>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
