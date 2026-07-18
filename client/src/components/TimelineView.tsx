import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  MarkerType as RFMarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type CoordinateExtent,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import type {
  CreateMarkerInput,
  CreateTaskInput,
  CreateTimelineInput,
  Group,
  Marker,
  MarkerType,
  Member,
  Project,
  Task,
  Timeline,
} from '@/types';
import { TaskDialog } from './TaskDialog';
import { EventDialog } from './EventDialog';
import { TimelineTabs } from './TimelineTabs';
import { addDays, dayDiff, memberOf, todayStr } from '@/utils';
import { assignLanes, type LayoutItem } from '@/lib/ganttLayout';
import {
  BAR_HEIGHT,
  BAR_INSET,
  BOX_PAD,
  DAY_WIDTH,
  LABEL_WIDTH,
  LANE_HEIGHT,
  MIN_ROW_HEIGHT,
  NOTE_SIZE,
} from './timeline/constants';
import { groupConsecutiveWithOffset } from './timeline/timelineVisuals';
import type { ProjectBand } from './timeline/types';
import { TaskBarNode, type TaskBarNodeData } from './timeline/TaskBarNode';
import { TimelineEventNode, type TimelineEventNodeData } from './timeline/TimelineEventNode';
import { TimelineNoteNode, type TimelineNoteNodeData } from './timeline/TimelineNoteNode';
import { TimelineDateHeader } from './timeline/TimelineDateHeader';
import { ProjectLabelColumn } from './timeline/ProjectLabelColumn';
import { ProjectBandBackground } from './timeline/ProjectBandBackground';
import { GroupBoxOverlay, type GroupBoxTaskNode } from './timeline/GroupBoxOverlay';
import { TodayHighlight } from './timeline/TodayHighlight';
import { AddItemPopover } from './timeline/AddItemPopover';

const nodeTypes = { taskBar: TaskBarNode, event: TimelineEventNode, note: TimelineNoteNode };

type TimelineNodeData = TaskBarNodeData | TimelineEventNodeData | TimelineNoteNodeData;

interface Props {
  members: Member[];
  projects: Project[];
  groups: Group[];
  tasks: Task[];
  markers: Marker[];
  timelines: Timeline[];
  onCreateTask: (data: CreateTaskInput, dependsOn: string[]) => Promise<void>;
  onMoveTaskNode: (taskId: string, x: number, y: number) => Promise<void>;
  onAddDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onRemoveDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onCreateMarker: (data: CreateMarkerInput) => Promise<void>;
  onMoveMarkerNode: (markerId: string, y: number) => Promise<void>;
  onCreateTimeline: (data: CreateTimelineInput) => Promise<void>;
  onUpdateTimeline: (id: string, data: CreateTimelineInput) => Promise<void>;
  onDeleteTimeline: (id: string) => Promise<void>;
  onOpenProject: (id: string) => void;
  onOpenGroup: (id: string) => void;
  onOpenTask: (id: string) => void;
  onOpenMarker: (id: string) => void;
  onResizeProject: (id: string, height: number) => Promise<void>;
}

const YEAR_START = '2026-01-01';
const YEAR_END = '2027-01-01';

export function TimelineView(props: Props) {
  return (
    <ReactFlowProvider>
      <TimelineCanvas {...props} />
    </ReactFlowProvider>
  );
}

function TimelineCanvas({
  members,
  projects,
  groups,
  tasks,
  markers,
  timelines,
  onCreateTask,
  onMoveTaskNode,
  onAddDependency,
  onRemoveDependency,
  onCreateMarker,
  onMoveMarkerNode,
  onCreateTimeline,
  onUpdateTimeline,
  onDeleteTimeline,
  onOpenProject,
  onOpenGroup,
  onOpenTask,
  onOpenMarker,
  onResizeProject,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TimelineNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [addPopover, setAddPopover] = useState<{
    clientX: number;
    clientY: number;
    projectId: string;
    date: string;
  } | null>(null);
  const [pendingAdd, setPendingAdd] = useState<{ kind: 'task' | 'event' | 'note'; projectId: string; date: string } | null>(
    null,
  );
  const [resizing, setResizing] = useState<{ projectId: string; height: number } | null>(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const activeTimeline = timelines.find((t) => t.id === activeTimelineId);
  const visibleProjects = useMemo(
    () => (activeTimeline ? projects.filter((p) => activeTimeline.project_ids.includes(p.id)) : projects),
    [activeTimeline, projects],
  );
  const visibleProjectIds = useMemo(() => new Set(visibleProjects.map((p) => p.id)), [visibleProjects]);
  const visibleTasks = useMemo(() => tasks.filter((t) => visibleProjectIds.has(t.project_id)), [tasks, visibleProjectIds]);
  const visibleMarkers = useMemo(
    () => markers.filter((m) => visibleProjectIds.has(m.project_id)),
    [markers, visibleProjectIds],
  );

  // 現状はタスクの有無にかかわらず2026年通年を基準表示にする(将来的に可変レンジ化する想定)
  const starts = [...visibleTasks.map((t) => t.start_date), ...visibleMarkers.map((m) => m.start_date)];
  const ends = [...visibleTasks.map((t) => t.end_date), ...visibleMarkers.map((m) => m.end_date ?? m.start_date)];
  const rangeStart = starts.length > 0 ? [YEAR_START, ...starts].reduce((a, b) => (a < b ? a : b)) : YEAR_START;
  const rangeEndRaw = ends.length > 0 ? ends.reduce((a, b) => (a > b ? a : b)) : YEAR_START;
  const rangeEnd = [YEAR_END, addDays(rangeEndRaw, 1)].reduce((a, b) => (a > b ? a : b));
  const totalDays = Math.max(dayDiff(rangeStart, rangeEnd), 1);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i)), [totalDays, rangeStart]);
  const yearGroups = useMemo(() => groupConsecutiveWithOffset(days, (d) => d.slice(0, 4)), [days]);
  const monthGroups = useMemo(() => groupConsecutiveWithOffset(days, (d) => d.slice(0, 7)), [days]);

  const today = todayStr();
  const todayOffset = dayDiff(rangeStart, today);
  const todayInRange = todayOffset >= 0 && todayOffset < totalDays;

  const bands = useMemo<ProjectBand[]>(() => {
    let cursorY = 0;
    return visibleProjects.map((project) => {
      const projectTasks = visibleTasks.filter((t) => t.project_id === project.id);
      const projectMarkers = visibleMarkers.filter((m) => m.project_id === project.id);
      const items: LayoutItem[] = [
        ...projectTasks.map((t) => ({
          id: t.id,
          groupId: t.group_id,
          startOffset: dayDiff(rangeStart, t.start_date),
          span: Math.max(dayDiff(t.start_date, t.end_date) + 1, 1),
        })),
        ...projectMarkers.map((m) => ({
          id: m.id,
          groupId: null,
          startOffset: dayDiff(rangeStart, m.start_date),
          span: m.end_date ? Math.max(dayDiff(m.start_date, m.end_date) + 1, 1) : 1,
        })),
      ];
      const { placed, groupBoxes, laneCount } = assignLanes(items);
      const hasGroups = groupBoxes.length > 0;
      const topPad = hasGroups ? 26 : 8;
      const minHeight = topPad + LANE_HEIGHT + 8;
      const autoHeight = Math.max(topPad + laneCount * LANE_HEIGHT + (hasGroups ? BOX_PAD : 0) + 8, MIN_ROW_HEIGHT);
      // ドラッグでリサイズ中はその場の高さを最優先。それ以外はrow_height(ユーザー指定、念のため1レーン分は下限)、
      // 未指定(0)ならレーン数に応じた自動計算にフォールバックする
      const rowHeight =
        resizing && resizing.projectId === project.id
          ? Math.max(resizing.height, minHeight)
          : project.row_height > 0
            ? Math.max(project.row_height, minHeight)
            : autoHeight;
      const yStart = cursorY;
      const yEnd = cursorY + rowHeight;
      cursorY = yEnd;
      return { projectId: project.id, yStart, yEnd, topPad, placed, laneCount };
    });
  }, [visibleProjects, visibleTasks, visibleMarkers, rangeStart, resizing]);

  // ReactFlow自体の縦方向パンは使わない(縦は外側の通常スクロールに任せる)。
  // ReactFlowのコンテナ自体をtotalHeightぴったりの高さにするので、縦にパンできる余地自体が生まれない。
  const EXTENT_PAD = 400;
  const gridWidth = totalDays * DAY_WIDTH;
  const totalHeight = bands.length > 0 ? bands[bands.length - 1].yEnd : MIN_ROW_HEIGHT;

  useEffect(() => {
    const next: Node<TimelineNodeData>[] = [];
    for (const band of bands) {
      for (const item of band.placed) {
        const task = visibleTasks.find((t) => t.id === item.id);
        const marker = task ? undefined : visibleMarkers.find((m) => m.id === item.id);
        const x = item.startOffset * DAY_WIDTH;
        const defaultY = band.yStart + band.topPad + item.lane * LANE_HEIGHT + BAR_INSET;
        // X方向は[x, x]のような幅ゼロの範囲にすると、ReactFlowがノード幅を考慮してクランプする際に
        // 実際の描画位置がノード幅ぶん左にずれてしまう(グループ枠は正しいxで計算するため、そこでズレが可視化される)。
        // そのためX方向はextentで制限せず、onNodeDragで毎フレームxを固定値に戻す方式にする。
        const extent: CoordinateExtent = [
          [Number.NEGATIVE_INFINITY, band.yStart],
          [Number.POSITIVE_INFINITY, band.yEnd - BAR_HEIGHT],
        ];
        if (task) {
          const width = Math.max(item.span * DAY_WIDTH - 4, 8);
          const member = memberOf(members, task.member_id);
          const y = task.node_y !== 0 ? task.node_y : defaultY;
          next.push({
            id: task.id,
            type: 'taskBar',
            position: { x, y },
            width,
            height: BAR_HEIGHT,
            style: { width, height: BAR_HEIGHT },
            extent,
            data: {
              title: task.title,
              status: task.status,
              color: member?.color ?? '#6366f1',
              groupId: task.group_id,
            } satisfies TaskBarNodeData,
          });
        } else if (marker) {
          const y = marker.node_y !== 0 ? marker.node_y : defaultY;
          if (marker.item_type === 'note') {
            next.push({
              id: marker.id,
              type: 'note',
              position: { x, y },
              width: NOTE_SIZE,
              height: NOTE_SIZE,
              style: { width: NOTE_SIZE, height: NOTE_SIZE },
              extent,
              data: { title: marker.title, color: marker.color } satisfies TimelineNoteNodeData,
            });
          } else {
            const width = Math.max(item.span * DAY_WIDTH - 4, 8);
            next.push({
              id: marker.id,
              type: 'event',
              position: { x, y },
              width,
              height: BAR_HEIGHT,
              style: { width, height: BAR_HEIGHT },
              extent,
              data: { title: marker.title, color: marker.color } satisfies TimelineEventNodeData,
            });
          }
        }
      }
    }
    setNodes(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bands, visibleTasks, visibleMarkers, members, setNodes]);

  useEffect(() => {
    const visibleIds = new Set(visibleTasks.map((t) => t.id));
    const next: Edge[] = [];
    for (const t of visibleTasks) {
      for (const depId of t.depends_on) {
        if (!visibleIds.has(depId)) continue;
        next.push({
          id: `${depId}->${t.id}`,
          source: depId,
          target: t.id,
          markerEnd: { type: RFMarkerType.ArrowClosed },
          animated: t.status !== 'done',
        });
      }
    }
    setEdges(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTasks, setEdges]);

  const taskNodesForBoxes = useMemo<GroupBoxTaskNode[]>(
    () =>
      nodes
        .filter((n) => n.type === 'taskBar')
        .map((n) => ({
          id: n.id,
          groupId: (n.data as TaskBarNodeData).groupId,
          x: n.position.x,
          y: n.position.y,
          width: n.width ?? 0,
        })),
    [nodes],
  );

  // 各アイテムの本来のX(日付から機械的に決まる、固定値)。onNodeDragで毎フレームこの値に戻す
  const fixedXById = useMemo(() => {
    const map = new Map<string, number>();
    for (const band of bands) {
      for (const item of band.placed) {
        map.set(item.id, item.startOffset * DAY_WIDTH);
      }
    }
    return map;
  }, [bands]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      void onAddDependency(connection.target, connection.source);
    },
    [onAddDependency],
  );

  const onNodeDrag = useCallback<OnNodeDrag<Node<TimelineNodeData>>>(
    (_event, node) => {
      const fixedX = fixedXById.get(node.id);
      if (fixedX === undefined || node.position.x === fixedX) return;
      setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, position: { x: fixedX, y: n.position.y } } : n)));
    },
    [fixedXById, setNodes],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<Node<TimelineNodeData>>>(
    (_event, node) => {
      const fixedX = fixedXById.get(node.id) ?? node.position.x;
      const y = Math.round(node.position.y);
      if (node.type === 'taskBar') {
        void onMoveTaskNode(node.id, Math.round(fixedX), y);
      } else {
        void onMoveMarkerNode(node.id, y);
      }
    },
    [fixedXById, onMoveTaskNode, onMoveMarkerNode],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) {
        void onRemoveDependency(e.target, e.source);
      }
    },
    [onRemoveDependency],
  );

  const onNodeDoubleClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      if (node.type === 'taskBar') {
        onOpenTask(node.id);
      } else {
        onOpenMarker(node.id);
      }
    },
    [onOpenTask, onOpenMarker],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const { x, y } = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const band = bands.find((b) => y >= b.yStart && y < b.yEnd);
      if (!band) return;
      const dayIndex = Math.max(0, Math.floor(x / DAY_WIDTH));
      const date = addDays(rangeStart, dayIndex);
      setAddPopover({ clientX: event.clientX, clientY: event.clientY, projectId: band.projectId, date });
    },
    [bands, rangeStart, screenToFlowPosition],
  );

  function handlePick(kind: 'task' | 'event' | 'note') {
    if (!addPopover) return;
    setPendingAdd({ kind, projectId: addPopover.projectId, date: addPopover.date });
    setAddPopover(null);
  }

  function jumpToToday() {
    if (!todayInRange) return;
    const width = wrapperRef.current?.clientWidth ?? 800;
    const targetFlowX = todayOffset * DAY_WIDTH + DAY_WIDTH / 2;
    const x = width / 2 - targetFlowX;
    setViewport({ x, y: 0, zoom: 1 }, { duration: 300 });
  }

  function handleResizeStart(projectId: string, startHeight: number, startClientY: number) {
    setResizing({ projectId, height: startHeight });

    function computeHeight(clientY: number) {
      return Math.max(startHeight + (clientY - startClientY), 40);
    }

    function onMouseMove(e: MouseEvent) {
      setResizing({ projectId, height: computeHeight(e.clientY) });
    }

    function onMouseUp(e: MouseEvent) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setResizing(null);
      void onResizeProject(projectId, Math.round(computeHeight(e.clientY)));
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <TimelineTabs
          projects={projects}
          timelines={timelines}
          activeTimelineId={activeTimelineId}
          onSelect={setActiveTimelineId}
          onCreateTimeline={onCreateTimeline}
          onUpdateTimeline={onUpdateTimeline}
          onDeleteTimeline={onDeleteTimeline}
        />
        <Button type="button" variant="outline" size="sm" onClick={jumpToToday} disabled={!todayInRange} className="shrink-0">
          今日
        </Button>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
          <p>プロジェクト・タスクを追加するとタイムラインが表示されるにゃ</p>
        </div>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <TimelineDateHeader
            yearGroups={yearGroups}
            monthGroups={monthGroups}
            days={days}
            today={today}
            todayOffset={todayOffset}
            todayInRange={todayInRange}
            labelWidth={LABEL_WIDTH}
          />
          <div className="flex">
            <ProjectLabelColumn
              bands={bands}
              projects={visibleProjects}
              labelWidth={LABEL_WIDTH}
              onOpenProject={onOpenProject}
              onResizeStart={handleResizeStart}
            />
            <div ref={wrapperRef} className="relative flex-1" style={{ height: totalHeight }}>
              <ReactFlow
                className="nowheel"
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                onEdgesDelete={onEdgesDelete}
                onNodeDoubleClick={onNodeDoubleClick}
                onPaneClick={onPaneClick}
                deleteKeyCode={['Backspace', 'Delete']}
                minZoom={1}
                maxZoom={1}
                panOnScroll={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                translateExtent={[
                  [-EXTENT_PAD, 0],
                  [gridWidth + EXTENT_PAD, totalHeight],
                ]}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Lines} gap={DAY_WIDTH} color="var(--border)" />
                <ProjectBandBackground bands={bands} />
                <TodayHighlight todayOffset={todayOffset} todayInRange={todayInRange} />
                <GroupBoxOverlay groups={groups} taskNodes={taskNodesForBoxes} onOpenGroup={onOpenGroup} />
              </ReactFlow>
              {addPopover && (
                <AddItemPopover
                  clientX={addPopover.clientX}
                  clientY={addPopover.clientY}
                  onPick={handlePick}
                  onClose={() => setAddPopover(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {pendingAdd?.kind === 'task' && (
        <TaskDialog
          members={members}
          projects={projects}
          groups={groups}
          tasks={tasks}
          defaultProjectId={pendingAdd.projectId}
          defaultStartDate={pendingAdd.date}
          defaultEndDate={pendingAdd.date}
          open
          onOpenChange={(o) => !o && setPendingAdd(null)}
          onSubmit={(data, dependsOn) => onCreateTask(data as CreateTaskInput, dependsOn)}
        />
      )}
      {pendingAdd && pendingAdd.kind !== 'task' && (
        <EventDialog
          projects={projects}
          defaultProjectId={pendingAdd.projectId}
          defaultDate={pendingAdd.date}
          defaultItemType={pendingAdd.kind as MarkerType}
          open
          onOpenChange={(o) => !o && setPendingAdd(null)}
          onSubmit={(data) => onCreateMarker(data as CreateMarkerInput)}
        />
      )}
    </div>
  );
}
