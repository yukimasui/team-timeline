export type Status = 'todo' | 'in_progress' | 'done';

export interface Member {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Group {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  group_id: string | null;
  member_id: string;
  title: string;
  description: string;
  status: Status;
  start_date: string;
  end_date: string;
  node_x: number;
  node_y: number;
  created_at: string;
  updated_at: string;
  depends_on: string[];
}

export interface CreateMemberInput {
  name: string;
  color?: string;
}

export interface CreateProjectInput {
  name: string;
  color?: string;
}

export interface CreateGroupInput {
  project_id: string;
  name: string;
  color?: string;
}

export type UpdateGroupInput = Partial<CreateGroupInput>;

export interface CreateTaskInput {
  project_id: string;
  /** 空文字は「グループなし」を表す */
  group_id: string;
  member_id: string;
  title: string;
  description?: string;
  status?: Status;
  start_date: string;
  end_date: string;
  node_x?: number;
  node_y?: number;
  depends_on?: string[];
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'depends_on'>>;
