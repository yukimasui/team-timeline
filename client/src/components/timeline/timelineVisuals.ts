import type { CSSProperties } from 'react';
import type { Status } from '@/types';

export function barStyle(status: Status, color: string): CSSProperties {
  if (status === 'done') {
    return { backgroundColor: '#9ca3af', border: `2px solid ${color}`, color: '#1f2937' };
  }
  if (status === 'todo') {
    return { backgroundColor: color, opacity: 0.55, color: 'white' };
  }
  return { backgroundColor: color, color: 'white' };
}

export function dayColorClass(d: string): string {
  const dow = new Date(d).getDay();
  if (dow === 0) return 'text-red-500';
  if (dow === 6) return 'text-blue-500';
  return 'text-muted-foreground';
}

export interface DayGroup {
  key: string;
  startOffset: number;
  count: number;
}

/** 連続する日付を年/月などの単位でグルーピングし、rangeStartからの日数オフセットも併せて返す */
export function groupConsecutiveWithOffset(days: string[], keyFn: (d: string) => string): DayGroup[] {
  const result: DayGroup[] = [];
  days.forEach((d, i) => {
    const key = keyFn(d);
    const last = result[result.length - 1];
    if (last && last.key === key) {
      last.count++;
    } else {
      result.push({ key, startOffset: i, count: 1 });
    }
  });
  return result;
}
