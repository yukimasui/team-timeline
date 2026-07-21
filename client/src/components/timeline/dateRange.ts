import { todayStr } from '@/utils';

/** タイムラインの表示期間。end は排他的(その日は含まない) */
export interface DateRange {
  start: string;
  end: string;
}

const STORAGE_KEY = 'team-timeline:timeline-range';

export function yearRange(year: number): DateRange {
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

/** UI表示用。range.start の年 */
export function yearOf(range: DateRange): number {
  return Number(range.start.slice(0, 4));
}

/** JST基準の今年 */
export function currentYear(): number {
  return Number(todayStr().slice(0, 4));
}

function isValidRange(value: unknown): value is DateRange {
  if (typeof value !== 'object' || value === null) return false;
  const { start, end } = value as Record<string, unknown>;
  return typeof start === 'string' && typeof end === 'string' && start < end;
}

export function loadRange(): DateRange | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidRange(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveRange(range: DateRange): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(range));
  } catch {
    // localStorageが使えない環境では何もしない
  }
}
