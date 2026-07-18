import type { PlacedItem } from '@/lib/ganttLayout';

export interface ProjectBand {
  projectId: string;
  yStart: number;
  yEnd: number;
  topPad: number;
  placed: PlacedItem[];
  laneCount: number;
}
