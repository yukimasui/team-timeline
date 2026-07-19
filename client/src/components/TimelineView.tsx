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
  type ResizeParams,
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
  NOTE_WIDTH,
  NOTE_HEIGHT,
} from './timeline/constants';
import { groupConsecutiveWithOffset } from './timeline/timelineVisuals';
import { dateFromResize } from './timeline/resizeMath';
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
  onSlideTaskNode: (taskId: string, data: { node_y: number; start_date: string; end_date: string }) => Promise<void>;
  onResizeTaskNode: (taskId: string, data: { start_date?: string; end_date?: string }) => Promise<void>;
  onAddDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onRemoveDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onCreateMarker: (data: CreateMarkerInput) => Promise<void>;
  onMoveMarkerNode: (markerId: string, y: number, x?: number) => Promise<void>;
  onSlideMarkerNode: (markerId: string, data: { node_y: number; start_date: string; end_date: string }) => Promise<void>;
  onResizeMarkerNode: (markerId: string, data: { start_date?: string; end_date?: string }) => Promise<void>;
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
  onSlideTaskNode,
  onResizeTaskNode,
  onAddDependency,
  onRemoveDependency,
  onCreateMarker,
  onMoveMarkerNode,
  onSlideMarkerNode,
  onResizeMarkerNode,
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
        // node_yはバンド絶対座標ではなく、band.yStartからの相対オフセットとして保持する
        // (プロジェクトの行高さ変更でband.yStartが動いても、バンド内の相対位置がずれないようにするため)
        const defaultOffset = band.topPad + item.lane * LANE_HEIGHT + BAR_INSET;
        // X方向は日毎グリッドスナップで自由にドラッグできるようextentで制限しない(Y方向のみバンド内に固定)。
        const extent: CoordinateExtent = [
          [Number.NEGATIVE_INFINITY, band.yStart],
          [Number.POSITIVE_INFINITY, band.yEnd - BAR_HEIGHT],
        ];
        if (task) {
          const width = Math.max(item.span * DAY_WIDTH - 4, 8);
          const member = memberOf(members, task.member_id);
          const y = band.yStart + (task.node_y !== 0 ? task.node_y : defaultOffset);
          const onResizeEnd = (edge: 'left' | 'right', params: ResizeParams) => {
            if (edge === 'left') {
              const newStart = dateFromResize('left', params, rangeStart, task.end_date);
              if (newStart !== task.start_date) void onResizeTaskNode(task.id, { start_date: newStart });
            } else {
              const newEnd = dateFromResize('right', params, rangeStart, task.start_date);
              if (newEnd !== task.end_date) void onResizeTaskNode(task.id, { end_date: newEnd });
            }
          };
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
              onResizeEnd,
            } satisfies TaskBarNodeData,
          });
        } else if (marker) {
          const y = band.yStart + (marker.node_y !== 0 ? marker.node_y : defaultOffset);
          if (marker.item_type === 'note') {
            const noteX = marker.node_x !== 0 ? marker.node_x : x;
            next.push({
              id: marker.id,
              type: 'note',
              position: { x: noteX, y },
              width: NOTE_WIDTH,
              height: NOTE_HEIGHT,
              style: { width: NOTE_WIDTH, height: NOTE_HEIGHT },
              extent,
              data: { title: marker.title, color: marker.color } satisfies TimelineNoteNodeData,
            });
          } else {
            const width = Math.max(item.span * DAY_WIDTH - 4, 8);
            const onResizeEnd = (edge: 'left' | 'right', params: ResizeParams) => {
              const markerEndDate = marker.end_date ?? marker.start_date;
              if (edge === 'left') {
                const newStart = dateFromResize('left', params, rangeStart, markerEndDate);
                if (newStart !== marker.start_date) void onResizeMarkerNode(marker.id, { start_date: newStart });
              } else {
                const newEnd = dateFromResize('right', params, rangeStart, marker.start_date);
                if (newEnd !== markerEndDate) void onResizeMarkerNode(marker.id, { end_date: newEnd });
              }
            };
            next.push({
              id: marker.id,
              type: 'event',
              position: { x, y },
              width,
              height: BAR_HEIGHT,
              style: { width, height: BAR_HEIGHT },
              extent,
              data: { title: marker.title, color: marker.color, onResizeEnd } satisfies TimelineEventNodeData,
            });
          }
        }
      }
    }
    setNodes(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bands, visibleTasks, visibleMarkers, members, setNodes, rangeStart, onResizeTaskNode, onResizeMarkerNode]);

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

  // 各アイテムが属するバンド(node_yをband.yStart基準の相対オフセットとして永続化するために使う)
  const bandById = useMemo(() => {
    const map = new Map<string, ProjectBand>();
    for (const band of bands) {
      for (const item of band.placed) {
        map.set(item.id, band);
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

  // タスクバー・イベントバーはドラッグ中から日毎グリッドにスナップして見せる(ノートは日付を持たないため対象外、自由移動のまま)
  const onNodeDrag = useCallback<OnNodeDrag<Node<TimelineNodeData>>>(
    (_event, node) => {
      if (node.type === 'note') return;
      const snappedX = Math.round(node.position.x / DAY_WIDTH) * DAY_WIDTH;
      if (node.position.x === snappedX) return;
      setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, position: { x: snappedX, y: n.position.y } } : n)));
    },
    [setNodes],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<Node<TimelineNodeData>>>(
    (_event, node) => {
      const band = bandById.get(node.id);
      const y = Math.round(node.position.y) - (band?.yStart ?? 0);
      const dayIndex = Math.round(node.position.x / DAY_WIDTH);
      const newStart = addDays(rangeStart, dayIndex);
      if (node.type === 'taskBar') {
        const task = visibleTasks.find((t) => t.id === node.id);
        if (!task) return;
        const duration = dayDiff(task.start_date, task.end_date);
        void onSlideTaskNode(node.id, { node_y: y, start_date: newStart, end_date: addDays(newStart, duration) });
      } else if (node.type === 'note') {
        void onMoveMarkerNode(node.id, y, Math.round(node.position.x));
      } else {
        const marker = visibleMarkers.find((m) => m.id === node.id);
        if (!marker) return;
        const duration = dayDiff(marker.start_date, marker.end_date ?? marker.start_date);
        void onSlideMarkerNode(node.id, { node_y: y, start_date: newStart, end_date: addDays(newStart, duration) });
      }
    },
    [bandById, rangeStart, visibleTasks, visibleMarkers, onSlideTaskNode, onMoveMarkerNode, onSlideMarkerNode],
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
