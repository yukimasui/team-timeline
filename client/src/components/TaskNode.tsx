import { Handle, Position, type NodeProps } from '@xyflow/react';
import { STATUS_LABEL } from '@/utils';
import type { Status } from '@/types';

export interface TaskNodeData {
  title: string;
  status: Status;
  memberName: string;
  memberColor: string;
  [key: string]: unknown;
}

export function TaskNode({ data, selected }: NodeProps) {
  const d = data as TaskNodeData;
  return (
    <div
      className={`w-52 rounded-lg border bg-background p-3 shadow-sm ${selected ? 'ring-2 ring-ring' : ''}`}
      style={{ borderLeftColor: d.memberColor, borderLeftWidth: 4 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <p className="truncate text-sm font-medium">{d.title}</p>
      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.memberColor }} />
          {d.memberName}
        </span>
        <span>{STATUS_LABEL[d.status]}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}
