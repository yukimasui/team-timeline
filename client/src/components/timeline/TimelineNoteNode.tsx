import type { NodeProps } from '@xyflow/react';

export interface TimelineNoteNodeData {
  title: string;
  color: string;
  [key: string]: unknown;
}

/** ノートは単一日の小さなピン。依存関係ハンドルは持たない */
export function TimelineNoteNode({ data, selected }: NodeProps) {
  const d = data as TimelineNoteNodeData;
  return (
    <div
      className={`h-full w-full rounded-full border-2 border-background shadow-sm ${selected ? 'ring-2 ring-ring' : ''}`}
      style={{ backgroundColor: d.color }}
      title={d.title}
    />
  );
}
