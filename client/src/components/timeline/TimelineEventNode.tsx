import type { NodeProps } from '@xyflow/react';

export interface TimelineEventNodeData {
  title: string;
  color: string;
  [key: string]: unknown;
}

/** イベントは可変幅バーだが依存関係ハンドルは持たない(タスクとの依存には参加しない) */
export function TimelineEventNode({ data, selected }: NodeProps) {
  const d = data as TimelineEventNodeData;
  return (
    <div
      className={`flex h-full items-center overflow-hidden rounded-md border-2 border-dashed px-2 text-left text-xs shadow-sm ${
        selected ? 'ring-2 ring-ring' : ''
      }`}
      style={{ backgroundColor: `${d.color}33`, borderColor: d.color, color: 'var(--foreground)' }}
      title={d.title}
    >
      <span className="truncate font-medium">{d.title}</span>
    </div>
  );
}
