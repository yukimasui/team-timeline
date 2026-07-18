import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { CreateGroupInput, CreateProjectInput, CreateTaskInput, Group, Member, Project, Task, UpdateTaskInput } from './types';
import { MemberDialog } from './components/MemberDialog';
import { ProjectDialog } from './components/ProjectDialog';
import { GroupDialog } from './components/GroupDialog';
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<ViewKey>('timeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  async function refresh() {
    const [m, p, g, t] = await Promise.all([api.listMembers(), api.listProjects(), api.listGroups(), api.listTasks()]);
    setMembers(m);
    setProjects(p);
    setGroups(g);
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

  async function handleCreateProject(data: CreateProjectInput) {
    await withErrorHandling(async () => {
      await api.createProject(data);
      await refresh();
    });
  }

  async function handleUpdateProject(id: string, data: CreateProjectInput) {
    await withErrorHandling(async () => {
      await api.updateProject(id, data);
      await refresh();
    });
  }

  async function handleDeleteProject(id: string) {
    await withErrorHandling(async () => {
      await api.deleteProject(id);
      await refresh();
    });
  }

  async function handleCreateGroup(data: CreateGroupInput) {
    await withErrorHandling(async () => {
      await api.createGroup(data);
      await refresh();
    });
  }

  async function handleUpdateGroup(id: string, data: CreateGroupInput) {
    await withErrorHandling(async () => {
      await api.updateGroup(id, data);
      await refresh();
    });
  }

  async function handleDeleteGroup(id: string) {
    await withErrorHandling(async () => {
      await api.deleteGroup(id);
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
  const editingProject = useMemo(() => projects.find((p) => p.id === editingProjectId), [projects, editingProjectId]);
  const editingGroup = useMemo(() => groups.find((g) => g.id === editingGroupId), [groups, editingGroupId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Team Timeline</h1>
          <p className="text-sm text-muted-foreground">誰が何をやっているか、ひと目でわかるにゃ</p>
        </div>
        <div className="flex items-center gap-2">
          <MemberDialog onCreate={handleCreateMember} />
          <ProjectDialog
            onSubmit={handleCreateProject}
            trigger={<button type="button" className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">+ プロジェクト</button>}
          />
          <GroupDialog
            projects={projects}
            onSubmit={handleCreateGroup}
            trigger={<button type="button" className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">+ グループ</button>}
          />
          <TaskDialog
            members={members}
            projects={projects}
            groups={groups}
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

      {!loading && members.length === 0 && (
        <div className="mb-4 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          まずは「+ メンバー」からチームメンバーを追加してほしいにゃ
        </div>
      )}
      {!loading && projects.length === 0 && (
        <div className="mb-4 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          「+ プロジェクト」からプロジェクトを追加してほしいにゃ
        </div>
      )}
      {loading ? (
        <p className="py-24 text-center text-muted-foreground">読み込み中...</p>
      ) : (
        <main>
          {view === 'timeline' && (
            <TimelineView
              members={members}
              projects={projects}
              groups={groups}
              tasks={tasks}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onOpenProject={setEditingProjectId}
              onOpenGroup={setEditingGroupId}
            />
          )}
          {view === 'kanban' && (
            <KanbanView
              members={members}
              projects={projects}
              groups={groups}
              tasks={tasks}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
          {view === 'table' && (
            <TableView
              members={members}
              projects={projects}
              groups={groups}
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
          projects={projects}
          groups={groups}
          tasks={tasks}
          task={editingTask}
          open={Boolean(editingTaskId)}
          onOpenChange={(o) => !o && setEditingTaskId(null)}
          onSubmit={(data, dependsOn) => handleUpdateTask(editingTask.id, data, dependsOn)}
          onDelete={() => handleDeleteTask(editingTask.id)}
        />
      )}

      {editingProject && (
        <ProjectDialog
          project={editingProject}
          open={Boolean(editingProjectId)}
          onOpenChange={(o) => !o && setEditingProjectId(null)}
          onSubmit={(data) => handleUpdateProject(editingProject.id, data)}
          onDelete={() => handleDeleteProject(editingProject.id)}
        />
      )}

      {editingGroup && (
        <GroupDialog
          projects={projects}
          group={editingGroup}
          open={Boolean(editingGroupId)}
          onOpenChange={(o) => !o && setEditingGroupId(null)}
          onSubmit={(data) => handleUpdateGroup(editingGroup.id, data)}
          onDelete={() => handleDeleteGroup(editingGroup.id)}
        />
      )}
    </div>
  );
}

export default App;
