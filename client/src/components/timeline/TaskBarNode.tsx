import {
  Handle,
  NodeResizeControl,
  Position,
  ResizeControlVariant,
  type NodeProps,
  type OnResizeEnd,
  type ResizeParams,
} from '@xyflow/react';
import type { Status } from '@/types';
import { barStyle } from './timelineVisuals';
import { MIN_BAR_WIDTH } from './constants';

export interface TaskBarNodeData {
  title: string;
  status: Status;
  color: string;
  groupId: string | null;
  onResizeEnd: (edge: 'left' | 'right', params: ResizeParams) => void;
  [key: string]: unknown;
}

const resizeHandleClass = '!h-full !w-2 !border-0 !bg-transparent hover:!bg-primary/50 transition-colors';

export function TaskBarNode({ data, selected }: NodeProps) {
  const d = data as TaskBarNodeData;
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
        className={`flex h-full items-center overflow-hidden rounded-md px-2 text-left text-xs shadow-sm ${
          selected ? 'ring-2 ring-ring' : ''
        }`}
        style={barStyle(d.status, d.color)}
        title={d.title}
      >
        <Handle type="target" position={Position.Left} className="!z-10 !bg-muted-foreground" />
        <span className="truncate">{d.title}</span>
        <Handle type="source" position={Position.Right} className="!z-10 !bg-muted-foreground" />
      </div>
    </div>
  );
}
