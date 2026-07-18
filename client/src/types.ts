export type Status = 'todo' | 'in_progress' | 'done';
export type Priority = 'high' | 'medium' | 'low';

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
  member_id: string | null;
  created_at: string;
  /** タイムライン上の行の高さ(px)。0は未設定(タスク数に応じて自動計算) */
  row_height: number;
}

export interface Group {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Timeline {
  id: string;
  name: string;
  project_ids: string[];
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
  priority: Priority;
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
  /** 空文字は「担当者なし」を表す */
  member_id?: string;
  /** 0(または未指定)はタスク数に応じた自動計算を表す */
  row_height?: number;
}

export interface CreateGroupInput {
  project_id: string;
  name: string;
  color?: string;
}

export type UpdateGroupInput = Partial<CreateGroupInput>;

export interface CreateTimelineInput {
  name: string;
  project_ids: string[];
}

export type UpdateTimelineInput = Partial<CreateTimelineInput>;

export interface CreateTaskInput {
  project_id: string;
  /** 空文字は「グループなし」を表す */
  group_id: string;
  member_id: string;
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  start_date: string;
  end_date: string;
  node_x?: number;
  node_y?: number;
  depends_on?: string[];
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'depends_on'>>;

export type MarkerType = 'event' | 'note';

export interface Marker {
  id: string;
  project_id: string;
  item_type: MarkerType;
  title: string;
  description: string;
  color: string;
  start_date: string;
  /** ノートはnull(単一日)。イベントは常に値を持つ */
  end_date: string | null;
  node_x: number;
  node_y: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMarkerInput {
  project_id: string;
  item_type: MarkerType;
  title: string;
  description?: string;
  color?: string;
  start_date: string;
  /** 空文字は「終了日なし(ノート)」を表す */
  end_date?: string;
  node_x?: number;
  node_y?: number;
}

export type UpdateMarkerInput = Partial<CreateMarkerInput>;
