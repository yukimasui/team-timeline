import type { Group, Member, Priority, Project, Status } from './types';

export const STATUS_LABEL: Record<Status, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
};

export const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done'];

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

export function memberOf(members: Member[], id: string): Member | undefined {
  return members.find((m) => m.id === id);
}

export function projectOf(projects: Project[], id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function groupOf(groups: Group[], id: string): Group | undefined {
  return groups.find((g) => g.id === id);
}

export function dayDiff(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatShort(date: string): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
