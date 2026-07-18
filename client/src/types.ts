export type Status = 'todo' | 'in_progress' | 'done';

export interface Member {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
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

export interface CreateTaskInput {
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
