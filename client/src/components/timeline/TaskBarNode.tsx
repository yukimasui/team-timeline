import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Status } from '@/types';
import { barStyle } from './timelineVisuals';

export interface TaskBarNodeData {
  title: string;
  status: Status;
  color: string;
  groupId: string | null;
  [key: string]: unknown;
}

export function TaskBarNode({ data, selected }: NodeProps) {
  const d = data as TaskBarNodeData;
  return (
    <div
      className={`flex h-full items-center overflow-hidden rounded-md px-2 text-left text-xs shadow-sm ${
        selected ? 'ring-2 ring-ring' : ''
      }`}
      style={barStyle(d.status, d.color)}
      title={d.title}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <span className="truncate">{d.title}</span>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}
