import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { CreateTaskInput, Member, Task, UpdateTaskInput } from './types';
import { MemberDialog } from './components/MemberDialog';
import { TaskDialog } from './components/TaskDialog';
import { TimelineView } from './components/TimelineView';
import { KanbanView } from './components/KanbanView';
import { TableView } from './components/TableView';
import { GraphView } from './components/GraphView';

type ViewKey = 'timeline' | 'kanban' | 'table' | 'graph';

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'timeline', label: 'タイムライン' },
  { key: 'kanban', label: 'カンバン' },
  { key: 'table', label: 'テーブル' },
  { key: 'graph', label: '依存関係グラフ' },
];

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<ViewKey>('timeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  async function refresh() {
    const [m, t] = await Promise.all([api.listMembers(), api.listTasks()]);
    setMembers(m);
    setTasks(t);
  }

  useEffect(() => {
    refresh()
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  async function withErrorHandling(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCreateMember(name: string, color: string) {
    await withErrorHandling(async () => {
      await api.createMember({ name, color });
      await refresh();
    });
  }

  async function handleCreateTask(data: CreateTaskInput, dependsOn: string[]) {
    await withErrorHandling(async () => {
      await api.createTask({ ...data, depends_on: dependsOn });
      await refresh();
    });
  }

  async function handleUpdateTask(id: string, data: UpdateTaskInput, dependsOn: string[]) {
    await withErrorHandling(async () => {
      await api.updateTask(id, data);
      const task = tasks.find((t) => t.id === id);
      const before = new Set(task?.depends_on ?? []);
      const after = new Set(dependsOn);
      const toAdd = [...after].filter((x) => !before.has(x));
      const toRemove = [...before].filter((x) => !after.has(x));
      await Promise.all([
        ...toAdd.map((depId) => api.addDependency(id, depId)),
        ...toRemove.map((depId) => api.removeDependency(id, depId)),
      ]);
      await refresh();
    });
  }

  async function handleDeleteTask(id: string) {
    await withErrorHandling(async () => {
      await api.deleteTask(id);
      await refresh();
    });
  }

  async function handleAddDependency(taskId: string, dependsOnTaskId: string) {
    await withErrorHandling(async () => {
      await api.addDependency(taskId, dependsOnTaskId);
      await refresh();
    });
  }

  async function handleRemoveDependency(taskId: string, dependsOnTaskId: string) {
    await withErrorHandling(async () => {
      await api.removeDependency(taskId, dependsOnTaskId);
      await refresh();
    });
  }

  async function handleMoveNode(taskId: string, x: number, y: number) {
    await withErrorHandling(async () => {
      await api.updateTask(taskId, { node_x: x, node_y: y });
      await refresh();
    });
  }

  const editingTask = useMemo(() => tasks.find((t) => t.id === editingTaskId), [tasks, editingTaskId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Team Timeline</h1>
          <p className="text-sm text-muted-foreground">誰が何をやっているか、ひと目でわかるにゃ</p>
        </div>
        <div className="flex items-center gap-2">
          <MemberDialog onCreate={handleCreateMember} />
          <TaskDialog
            members={members}
            tasks={tasks}
            onSubmit={(data, dependsOn) => handleCreateTask(data as CreateTaskInput, dependsOn)}
            trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90">+ タスク</button>}
          />
        </div>
      </header>

      <nav className="mb-4 flex gap-1 rounded-lg border bg-muted/30 p-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v.key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            閉じる
          </button>
        </div>
      )}

      {members.length === 0 && !loading && (
        <div className="mb-4 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          まずは「+ メンバー」からチームメンバーを追加してほしいにゃ
        </div>
      )}

      {loading ? (
        <p className="py-24 text-center text-muted-foreground">読み込み中...</p>
      ) : (
        <main>
          {view === 'timeline' && (
            <TimelineView
              members={members}
              tasks={tasks}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
          {view === 'kanban' && (
            <KanbanView
              members={members}
              tasks={tasks}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
          {view === 'table' && (
            <TableView
              members={members}
              tasks={tasks}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
          {view === 'graph' && (
            <GraphView
              members={members}
              tasks={tasks}
              onAddDependency={handleAddDependency}
              onRemoveDependency={handleRemoveDependency}
              onMoveNode={handleMoveNode}
              onOpenTask={setEditingTaskId}
            />
          )}
        </main>
      )}

      {editingTask && (
        <TaskDialog
          members={members}
          tasks={tasks}
          task={editingTask}
          open={Boolean(editingTaskId)}
          onOpenChange={(o) => !o && setEditingTaskId(null)}
          onSubmit={(data, dependsOn) => handleUpdateTask(editingTask.id, data, dependsOn)}
          onDelete={() => handleDeleteTask(editingTask.id)}
        />
      )}
    </div>
  );
}

export default App;
