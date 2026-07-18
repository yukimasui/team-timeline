import type {
  CreateGroupInput,
  CreateMemberInput,
  CreateProjectInput,
  CreateTaskInput,
  Group,
  Member,
  Project,
  Task,
  UpdateGroupInput,
  UpdateTaskInput,
} from './types';

const BASE = '/api';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function json(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export const api = {
  listMembers: () => fetch(`${BASE}/members`).then((r) => handle<Member[]>(r)),
  createMember: (data: CreateMemberInput) =>
    fetch(`${BASE}/members`, json('POST', data)).then((r) => handle<Member>(r)),
  updateMember: (id: string, data: Partial<CreateMemberInput>) =>
    fetch(`${BASE}/members/${id}`, json('PUT', data)).then((r) => handle<Member>(r)),
  deleteMember: (id: string) => fetch(`${BASE}/members/${id}`, json('DELETE')).then((r) => handle<void>(r)),

  listProjects: () => fetch(`${BASE}/projects`).then((r) => handle<Project[]>(r)),
  createProject: (data: CreateProjectInput) =>
    fetch(`${BASE}/projects`, json('POST', data)).then((r) => handle<Project>(r)),
  updateProject: (id: string, data: Partial<CreateProjectInput>) =>
    fetch(`${BASE}/projects/${id}`, json('PUT', data)).then((r) => handle<Project>(r)),
  deleteProject: (id: string) => fetch(`${BASE}/projects/${id}`, json('DELETE')).then((r) => handle<void>(r)),

  listGroups: () => fetch(`${BASE}/groups`).then((r) => handle<Group[]>(r)),
  createGroup: (data: CreateGroupInput) => fetch(`${BASE}/groups`, json('POST', data)).then((r) => handle<Group>(r)),
  updateGroup: (id: string, data: UpdateGroupInput) =>
    fetch(`${BASE}/groups/${id}`, json('PUT', data)).then((r) => handle<Group>(r)),
  deleteGroup: (id: string) => fetch(`${BASE}/groups/${id}`, json('DELETE')).then((r) => handle<void>(r)),

  listTasks: () => fetch(`${BASE}/tasks`).then((r) => handle<Task[]>(r)),
  createTask: (data: CreateTaskInput) => fetch(`${BASE}/tasks`, json('POST', data)).then((r) => handle<Task>(r)),
  updateTask: (id: string, data: UpdateTaskInput) =>
    fetch(`${BASE}/tasks/${id}`, json('PUT', data)).then((r) => handle<Task>(r)),
  deleteTask: (id: string) => fetch(`${BASE}/tasks/${id}`, json('DELETE')).then((r) => handle<void>(r)),

  addDependency: (taskId: string, dependsOnTaskId: string) =>
    fetch(`${BASE}/tasks/${taskId}/dependencies`, json('POST', { depends_on_task_id: dependsOnTaskId })).then((r) =>
      handle<void>(r),
    ),
  removeDependency: (taskId: string, dependsOnTaskId: string) =>
    fetch(`${BASE}/tasks/${taskId}/dependencies/${dependsOnTaskId}`, json('DELETE')).then((r) => handle<void>(r)),
};
