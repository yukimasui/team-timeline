import { useViewport } from '@xyflow/react';
import { DAY_WIDTH } from './constants';

interface Props {
  todayOffset: number;
  todayInRange: boolean;
}

export function TodayHighlight({ todayOffset, todayInRange }: Props) {
  const { x: panX, zoom } = useViewport();
  if (!todayInRange) return null;
  return (
    <div
      className="pointer-events-none absolute inset-y-0 bg-amber-400/10"
      style={{ left: todayOffset * DAY_WIDTH * zoom + panX, width: DAY_WIDTH * zoom }}
    />
  );
}
