import { useCallback, useMemo } from 'react';
import { useStore, useViewport, type ReactFlowState } from '@xyflow/react';
import type { Group } from '@/types';
import { BAR_HEIGHT, BOX_PAD } from './constants';
import type { TaskBarNodeData } from './TaskBarNode';

export interface GroupBoxTaskNode {
  id: string;
  groupId: string | null;
  x: number;
  y: number;
  width: number;
}

interface Props {
  groups: Group[];
  onOpenGroup: (id: string) => void;
}

function eqTaskNodes(a: GroupBoxTaskNode[], b: GroupBoxTaskNode[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].groupId !== b[i].groupId ||
      a[i].x !== b[i].x ||
      a[i].y !== b[i].y ||
      a[i].width !== b[i].width
    ) {
      return false;
    }
  }
  return true;
}

/**
 * グループ枠は React Flow が実際に描画しているノード座標(内部の positionAbsolute)から毎回ライブ計算する。
 * 制御state(nodes)ではなく内部座標を使うのは、extentによる縦クランプ後の実描画位置とグループ枠を必ず一致させ、
 * プロジェクト高さ変更中もノードとズレなく追従させるため(#24)。ドラッグ中もリアルタイムに追従する。
 */
export function GroupBoxOverlay({ groups, onOpenGroup }: Props) {
  const { x: panX, y: panY, zoom } = useViewport();

  const taskNodes = useStore(
    useCallback((s: ReactFlowState) => {
      const result: GroupBoxTaskNode[] = [];
      for (const n of s.nodeLookup.values()) {
        if (n.type !== 'taskBar') continue;
        const groupId = (n.data as TaskBarNodeData).groupId;
        if (!groupId) continue;
        result.push({
          id: n.id,
          groupId,
          x: n.internals.positionAbsolute.x,
          y: n.internals.positionAbsolute.y,
          width: n.measured?.width ?? n.width ?? 0,
        });
      }
      return result;
    }, []),
    eqTaskNodes,
  );

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
