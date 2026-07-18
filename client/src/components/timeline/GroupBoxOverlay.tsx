import { useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import type { Group } from '@/types';
import { BAR_HEIGHT, BOX_PAD } from './constants';

export interface GroupBoxTaskNode {
  id: string;
  groupId: string | null;
  x: number;
  y: number;
  width: number;
}

interface Props {
  groups: Group[];
  taskNodes: GroupBoxTaskNode[];
  onOpenGroup: (id: string) => void;
}

/**
 * グループ枠は現在の nodes state から毎回ライブ計算する(RFのparentId機能は使わない)。
 * ドラッグ中もリアルタイムに追従する。
 */
export function GroupBoxOverlay({ groups, taskNodes, onOpenGroup }: Props) {
  const { x: panX, y: panY, zoom } = useViewport();

  const boxes = useMemo(() => {
    const byGroup = new Map<string, GroupBoxTaskNode[]>();
    for (const n of taskNodes) {
      if (!n.groupId) continue;
      const arr = byGroup.get(n.groupId) ?? [];
      arr.push(n);
      byGroup.set(n.groupId, arr);
    }
    return [...byGroup.entries()].map(([groupId, ns]) => ({
      groupId,
      left: Math.min(...ns.map((n) => n.x)),
      right: Math.max(...ns.map((n) => n.x + n.width)),
      top: Math.min(...ns.map((n) => n.y)),
      bottom: Math.max(...ns.map((n) => n.y + BAR_HEIGHT)),
    }));
  }, [taskNodes]);

  return (
    <>
      {boxes.map((box) => {
        const group = groups.find((g) => g.id === box.groupId);
        if (!group) return null;
        const left = (box.left - 6) * zoom + panX;
        const top = (box.top - BOX_PAD) * zoom + panY;
        const width = (box.right - box.left + 12) * zoom;
        const height = (box.bottom - box.top + BOX_PAD * 2) * zoom;
        return (
          <div key={box.groupId}>
            <div
              className="pointer-events-none absolute z-[2] rounded-lg border-2"
              style={{ left, top, width, height, borderColor: group.color, backgroundColor: `${group.color}1a` }}
            />
            <button
              type="button"
              onClick={() => onOpenGroup(group.id)}
              className="absolute z-[3] truncate rounded px-1.5 text-[10px] font-medium text-white shadow-sm hover:opacity-90"
              style={{ left, top: top - 14, maxWidth: width, backgroundColor: group.color }}
            >
              {group.name}
            </button>
          </div>
        );
      })}
    </>
  );
}
