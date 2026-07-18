import type { NodeProps } from '@xyflow/react';

export interface TimelineNoteNodeData {
  title: string;
  color: string;
  [key: string]: unknown;
}

/** ノートは付箋風の自由配置アイテム。単一日で依存関係ハンドルは持たない。横方向はドラッグで自由に動かせる(日付とは無関係) */
export function TimelineNoteNode({ data, selected }: NodeProps) {
  const d = data as TimelineNoteNodeData;
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-sm border-l-4 p-1.5 text-left text-xs shadow-sm ${
        selected ? 'ring-2 ring-ring' : ''
      }`}
      style={{ backgroundColor: `${d.color}26`, borderColor: d.color, color: 'var(--foreground)' }}
      title={d.title}
    >
      <span className="line-clamp-3 break-words leading-snug">{d.title}</span>
    </div>
  );
}
