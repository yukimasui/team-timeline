import { useViewport } from '@xyflow/react';
import { DAY_ROW_HEIGHT, DAY_WIDTH, HEADER_HEIGHT, MONTH_ROW_HEIGHT, YEAR_ROW_HEIGHT } from './constants';
import { dayColorClass, type DayGroup } from './timelineVisuals';

interface Props {
  yearGroups: DayGroup[];
  monthGroups: DayGroup[];
  days: string[];
  today: string;
  todayOffset: number;
  todayInRange: boolean;
  labelWidth: number;
}

/**
 * タイムライン最上部のsticky行(年/月/日の3段ヘッダー)。ReactFlowの外側(ReactFlowProvider配下)に置き、
 * 縦方向はCSSのposition:stickyで固定しつつ、横方向のみuseViewport()でReactFlowのpanX/zoomに追従させる。
 */
export function TimelineDateHeader({ yearGroups, monthGroups, days, today, todayOffset, todayInRange, labelWidth }: Props) {
  const { x: panX, zoom } = useViewport();

  return (
    <div className="sticky top-0 z-40 flex overflow-hidden border-b bg-muted" style={{ height: HEADER_HEIGHT }}>
      <div
        className="flex shrink-0 items-end border-r bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
        style={{ width: labelWidth, height: HEADER_HEIGHT }}
      >
        プロジェクト
      </div>
      <div className="relative flex-1 overflow-hidden" style={{ height: HEADER_HEIGHT }}>
        <div className="relative border-b border-border/60" style={{ height: YEAR_ROW_HEIGHT }}>
          {yearGroups.map((g) => (
            <div
              key={g.key}
              className="absolute flex items-center justify-center border-r text-[11px] font-medium text-muted-foreground"
              style={{
                left: g.startOffset * DAY_WIDTH * zoom + panX,
                width: g.count * DAY_WIDTH * zoom,
                height: YEAR_ROW_HEIGHT,
              }}
            >
              {g.key}年
            </div>
          ))}
        </div>
        <div className="relative border-b border-border/60" style={{ height: MONTH_ROW_HEIGHT }}>
          {monthGroups.map((g) => (
            <div
              key={g.key}
              className="absolute flex items-center justify-center border-r text-[11px] text-muted-foreground"
              style={{
                left: g.startOffset * DAY_WIDTH * zoom + panX,
                width: g.count * DAY_WIDTH * zoom,
                height: MONTH_ROW_HEIGHT,
              }}
            >
              {parseInt(g.key.slice(5, 7), 10)}月
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: DAY_ROW_HEIGHT }}>
          {todayInRange && (
            <div
              className="absolute top-0 bg-amber-400/20"
              style={{ left: todayOffset * DAY_WIDTH * zoom + panX, width: DAY_WIDTH * zoom, height: DAY_ROW_HEIGHT }}
            />
          )}
          {days.map((d, i) => (
            <div
              key={d}
              className={`absolute flex items-center justify-center border-r text-xs ${
                d === today ? 'font-semibold text-foreground' : dayColorClass(d)
              }`}
              style={{ left: i * DAY_WIDTH * zoom + panX, width: DAY_WIDTH * zoom, height: DAY_ROW_HEIGHT }}
            >
              {parseInt(d.slice(8, 10), 10)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
