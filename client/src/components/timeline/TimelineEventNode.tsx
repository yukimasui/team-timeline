import {
  NodeResizeControl,
  ResizeControlVariant,
  type NodeProps,
  type OnResizeEnd,
  type ResizeParams,
} from '@xyflow/react';
import { MIN_BAR_WIDTH } from './constants';

export interface TimelineEventNodeData {
  title: string;
  color: string;
  onResizeEnd: (edge: 'left' | 'right', params: ResizeParams) => void;
  [key: string]: unknown;
}

const resizeHandleClass = '!h-full !w-2 !border-0 !bg-transparent hover:!bg-primary/50 transition-colors';

/** イベントは可変幅バーだが依存関係ハンドルは持たない(タスクとの依存には参加しない) */
export function TimelineEventNode({ data, selected }: NodeProps) {
  const d = data as TimelineEventNodeData;
  const onLeftEnd: OnResizeEnd = (_event, params) => d.onResizeEnd('left', params);
  const onRightEnd: OnResizeEnd = (_event, params) => d.onResizeEnd('right', params);
  return (
    // 内側をoverflow-hiddenにして角丸を保ちつつ、リサイズハンドルは外側(クリップされない層)に置く
    <div className="relative h-full w-full">
      <NodeResizeControl
        position="left"
        variant={ResizeControlVariant.Line}
        resizeDirection="horizontal"
        minWidth={MIN_BAR_WIDTH}
        onResizeEnd={onLeftEnd}
        className={resizeHandleClass}
      />
      <NodeResizeControl
        position="right"
        variant={ResizeControlVariant.Line}
        resizeDirection="horizontal"
        minWidth={MIN_BAR_WIDTH}
        onResizeEnd={onRightEnd}
        className={resizeHandleClass}
      />
      <div
        className={`flex h-full items-center overflow-hidden rounded-md border-2 border-dashed px-2 text-left text-xs shadow-sm ${
          selected ? 'ring-2 ring-ring' : ''
        }`}
        style={{ backgroundColor: `${d.color}33`, borderColor: d.color, color: 'var(--foreground)' }}
        title={d.title}
      >
        <span className="truncate font-medium">{d.title}</span>
      </div>
    </div>
  );
}
