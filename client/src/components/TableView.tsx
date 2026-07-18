import type { CreateTaskInput, Member, Task, UpdateTaskInput } from '@/types';
import { TaskDialog } from './TaskDialog';
import { memberOf, STATUS_LABEL } from '@/utils';

interface Props {
  members: Member[];
  tasks: Task[];
  onCreateTask: (data: CreateTaskInput, dependsOn: string[]) => Promise<void>;
  onUpdateTask: (id: string, data: UpdateTaskInput, dependsOn: string[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export function TableView({ members, tasks, onCreateTask, onUpdateTask, onDeleteTask }: Props) {
  const sorted = [...tasks].sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">タスク</th>
            <th className="px-3 py-2 font-medium">担当者</th>
            <th className="px-3 py-2 font-medium">ステータス</th>
            <th className="px-3 py-2 font-medium">開始日</th>
            <th className="px-3 py-2 font-medium">終了日</th>
            <th className="px-3 py-2 font-medium">依存先</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const member = memberOf(members, t.member_id);
            const depNames = t.depends_on
              .map((id) => tasks.find((x) => x.id === id)?.title)
              .filter(Boolean)
              .join(', ');
            return (
              <TaskDialog
                key={t.id}
                members={members}
                tasks={tasks}
                task={t}
                onSubmit={(data, dependsOn) => onUpdateTask(t.id, data, dependsOn)}
                onDelete={() => onDeleteTask(t.id)}
                trigger={
                  <tr className="cursor-pointer border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{t.title}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: member?.color }} />
                        {member?.name ?? '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{STATUS_LABEL[t.status]}</td>
                    <td className="px-3 py-2 text-muted-foreground">{t.start_date}</td>
                    <td className="px-3 py-2 text-muted-foreground">{t.end_date}</td>
                    <td className="px-3 py-2 text-muted-foreground">{depNames || '-'}</td>
                  </tr>
                }
              />
            );
          })}
        </tbody>
      </table>
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
