export interface LayoutItem {
  id: string;
  groupId: string | null;
  startOffset: number;
  span: number;
}

export interface PlacedItem extends LayoutItem {
  lane: number;
}

export interface GroupBox {
  groupId: string;
  laneStart: number;
  laneCount: number;
  startOffset: number;
  span: number;
}

export interface LaneResult {
  placed: PlacedItem[];
  groupBoxes: GroupBox[];
  laneCount: number;
}

/**
 * 同一プロジェクト行内でアイテム(タスク/イベント/ノート)が重ならないようレーンを割り当てる。
 * グループに属するアイテムはグループ単位で連続したレーンにまとめ、グループなしは個別に詰める。
 */
export function assignLanes(items: LayoutItem[]): LaneResult {
  const occupied: [number, number][][] = [];
  const isFree = (lane: number, s: number, e: number) =>
    (occupied[lane] ?? []).every(([os, oe]) => e <= os || s >= oe);
  const markOccupied = (lane: number, s: number, e: number) => {
    (occupied[lane] ??= []).push([s, e]);
  };
  const findFreeBlock = (laneCount: number, s: number, e: number) => {
    let lane = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let ok = true;
      for (let i = 0; i < laneCount; i++) {
        if (!isFree(lane + i, s, e)) {
          ok = false;
          break;
        }
      }
      if (ok) return lane;
      lane++;
    }
  };

  const placed: PlacedItem[] = [];
  const groupBoxes: GroupBox[] = [];

  const byGroup = new Map<string, LayoutItem[]>();
  const ungrouped: LayoutItem[] = [];
  for (const item of items) {
    if (item.groupId) {
      const arr = byGroup.get(item.groupId) ?? [];
      arr.push(item);
      byGroup.set(item.groupId, arr);
    } else {
      ungrouped.push(item);
    }
  }

  const groupEntries = [...byGroup.entries()].sort(
    (a, b) => Math.min(...a[1].map((i) => i.startOffset)) - Math.min(...b[1].map((i) => i.startOffset)),
  );

  for (const [groupId, groupItems] of groupEntries) {
    const sorted = [...groupItems].sort((a, b) => a.startOffset - b.startOffset);
    const laneEnds: number[] = [];
    const relLane = new Map<LayoutItem, number>();
    for (const item of sorted) {
      const s = item.startOffset;
      const e = item.startOffset + item.span;
      let lane = laneEnds.findIndex((end) => end <= s);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(e);
      } else {
        laneEnds[lane] = e;
      }
      relLane.set(item, lane);
    }
    const laneCount = laneEnds.length;
    const groupStart = Math.min(...groupItems.map((i) => i.startOffset));
    const groupEnd = Math.max(...groupItems.map((i) => i.startOffset + i.span));
    const baseLane = findFreeBlock(laneCount, groupStart, groupEnd);

    for (const item of sorted) {
      placed.push({ ...item, lane: baseLane + (relLane.get(item) ?? 0) });
    }
    for (let i = 0; i < laneCount; i++) markOccupied(baseLane + i, groupStart, groupEnd);
    groupBoxes.push({ groupId, laneStart: baseLane, laneCount, startOffset: groupStart, span: groupEnd - groupStart });
  }

  const sortedUngrouped = [...ungrouped].sort((a, b) => a.startOffset - b.startOffset);
  for (const item of sortedUngrouped) {
    const s = item.startOffset;
    const e = item.startOffset + item.span;
    const lane = findFreeBlock(1, s, e);
    placed.push({ ...item, lane });
    markOccupied(lane, s, e);
  }

  const laneCount = Math.max(1, ...placed.map((p) => p.lane + 1));
  return { placed, groupBoxes, laneCount };
}
