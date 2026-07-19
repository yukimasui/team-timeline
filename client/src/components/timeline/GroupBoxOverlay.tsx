import { useCallback, useMemo, useRef } from 'react';
import { useStore, useViewport, type ReactFlowState } from '@xyflow/react';
import type { Group } from '@/types';
import { BAR_HEIGHT, BOX_PAD, DAY_WIDTH } from './constants';
import type { TaskBarNodeData } from './TaskBarNode';

export interface GroupBoxTaskNode {
  id: string;
  groupId: string | null;
  x: number;
  y: number;
  width: number;
}

/** これ未満のドラッグはクリック(グループ編集)として扱う */
const DRAG_THRESHOLD_PX = 4;

interface Props {
  groups: Group[];
  /** タブを掴んだ瞬間。TimelineView 側で対象ノードの基準位置をスナップショットする */
  onGroupDragStart: (groupId: string) => void;
  /** ドラッグ中。フロー座標での移動量(X は日毎スナップ済み・Y は自由) */
  onGroupDragMove: (snappedDx: number, rawDy: number) => void;
  /** 指を離した。moved=true なら一括確定、false ならクリック扱い(グループ編集を開く) */
  onGroupDragEnd: (groupId: string, moved: boolean) => void;
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
export function GroupBoxOverlay({ groups, onGroupDragStart, onGroupDragMove, onGroupDragEnd }: Props) {
  const { x: panX, y: panY, zoom } = useViewport();
  const dragRef = useRef<{
    groupId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  // グループのタブを掴んでドラッグすると、そのグループの taskBar ノードをまとめて平行移動する。
  // 実際のノード移動は TimelineView 側の controlled setNodes(useNodesState)で行う。ここはポインタ入力に専念し、
  // フロー座標の移動量だけを親へ渡す。setPointerCapture でポインタをタブに固定し React Flow のパン処理と競合させない。
  const handleTabPointerDown = useCallback(
    (event: React.PointerEvent, groupId: string) => {
      event.preventDefault();
      event.stopPropagation();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      dragRef.current = { groupId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
      onGroupDragStart(groupId);
    },
    [onGroupDragStart],
  );

  const handleTabPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const rawDx = (event.clientX - drag.startX) / zoom;
      const rawDy = (event.clientY - drag.startY) / zoom;
      if (Math.abs(event.clientX - drag.startX) >= DRAG_THRESHOLD_PX || Math.abs(event.clientY - drag.startY) >= DRAG_THRESHOLD_PX) {
        drag.moved = true;
      }
      const snappedDx = Math.round(rawDx / DAY_WIDTH) * DAY_WIDTH;
      onGroupDragMove(snappedDx, rawDy);
    },
    [zoom, onGroupDragMove],
  );

  const handleTabPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      onGroupDragEnd(drag.groupId, drag.moved);
    },
    [onGroupDragEnd],
  );

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
              onPointerDown={(e) => handleTabPointerDown(e, group.id)}
              onPointerMove={handleTabPointerMove}
              onPointerUp={handleTabPointerUp}
              className="nopan absolute z-[10] cursor-grab touch-none truncate rounded px-1.5 text-[10px] font-medium text-white shadow-sm hover:opacity-90 active:cursor-grabbing"
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
