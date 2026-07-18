import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useViewport,
  type Connection,
  type CoordinateExtent,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { CreateTimelineInput, Member, Project, Task, Timeline } from '@/types';
import { addDays, dayDiff, formatShort, memberOf, todayStr } from '@/utils';
import { TaskNode, type TaskNodeData } from './TaskNode';
import { TimelineTabs } from './TimelineTabs';

const nodeTypes = { task: TaskNode };
const X_SCALE_PER_DAY = 50;

interface Props {
  members: Member[];
  projects: Project[];
  tasks: Task[];
  timelines: Timeline[];
  onAddDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onRemoveDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onMoveNode: (taskId: string, x: number, y: number) => Promise<void>;
  onOpenTask: (taskId: string) => void;
  onCreateTimeline: (data: CreateTimelineInput) => Promise<void>;
  onUpdateTimeline: (id: string, data: CreateTimelineInput) => Promise<void>;
  onDeleteTimeline: (id: string) => Promise<void>;
}

function DateAxis({ rangeStart, totalDays }: { rangeStart: string; totalDays: number }) {
  const { x: panX, zoom } = useViewport();
  const tickEvery = totalDays > 120 ? 30 : totalDays > 30 ? 7 : 1;
  const ticks = useMemo(() => {
    const result: number[] = [];
    for (let d = 0; d <= totalDays; d += tickEvery) result.push(d);
    return result;
  }, [totalDays, tickEvery]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 overflow-hidden border-b bg-background/90">
      {ticks.map((d) => {
        const screenX = d * X_SCALE_PER_DAY * zoom + panX;
        return (
          <div key={d} className="absolute top-1 text-[10px] text-muted-foreground" style={{ left: screenX }}>
            {formatShort(addDays(rangeStart, d))}
          </div>
        );
      })}
    </div>
  );
}

export function GraphView({
  members,
  projects,
  tasks,
  timelines,
  onAddDependency,
  onRemoveDependency,
  onMoveNode,
  onOpenTask,
  onCreateTimeline,
  onUpdateTimeline,
  onDeleteTimeline,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TaskNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);

  const activeTimeline = timelines.find((t) => t.id === activeTimelineId);
  const visibleTasks = useMemo(
    () => (activeTimeline ? tasks.filter((t) => activeTimeline.project_ids.includes(t.project_id)) : tasks),
    [tasks, activeTimeline],
  );

  const rangeStart = useMemo(() => {
    const starts = visibleTasks.map((t) => t.start_date);
    return starts.length > 0 ? starts.reduce((a, b) => (a < b ? a : b)) : todayStr();
  }, [visibleTasks]);
  const totalDays = useMemo(() => {
    const ends = visibleTasks.map((t) => t.end_date);
    const rangeEnd = ends.length > 0 ? ends.reduce((a, b) => (a > b ? a : b)) : rangeStart;
    return Math.max(dayDiff(rangeStart, rangeEnd), 1);
  }, [visibleTasks, rangeStart]);

  useEffect(() => {
    setNodes(
      visibleTasks.map((t, i) => {
        const member = memberOf(members, t.member_id);
        const x = dayDiff(rangeStart, t.start_date) * X_SCALE_PER_DAY;
        const y = t.node_y !== 0 ? t.node_y : (i % 4) * 160 + 40;
        const extent: CoordinateExtent = [
          [x, Number.NEGATIVE_INFINITY],
          [x, Number.POSITIVE_INFINITY],
        ];
        return {
          id: t.id,
          type: 'task',
          position: { x, y },
          extent,
          data: {
            title: t.title,
            status: t.status,
            memberName: member?.name ?? '',
            memberColor: member?.color ?? '#999999',
          } satisfies TaskNodeData,
        };
      }),
    );
  }, [visibleTasks, members, rangeStart, setNodes]);

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
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: t.status !== 'done',
        });
      }
    }
    setEdges(next);
  }, [visibleTasks, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      void onAddDependency(connection.target, connection.source);
    },
    [onAddDependency],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<Node<TaskNodeData>>>(
    (_event, node) => {
      void onMoveNode(node.id, Math.round(node.position.x), Math.round(node.position.y));
    },
    [onMoveNode],
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
      onOpenTask(node.id);
    },
    [onOpenTask],
  );

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b px-2 py-1.5">
        <TimelineTabs
          projects={projects}
          timelines={timelines}
          activeTimelineId={activeTimelineId}
          onSelect={setActiveTimelineId}
          onCreateTimeline={onCreateTimeline}
          onUpdateTimeline={onUpdateTimeline}
          onDeleteTimeline={onDeleteTimeline}
        />
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
          <p>タスクを追加すると、ノードをドラッグで繋いで依存関係を作れるにゃ</p>
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
          <p>このタイムラインタブに該当するタスクがないにゃ</p>
        </div>
      ) : (
        <div className="relative h-[70vh]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onEdgesDelete={onEdgesDelete}
            onNodeDoubleClick={onNodeDoubleClick}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable className="!bg-background" />
            <DateAxis rangeStart={rangeStart} totalDays={totalDays} />
          </ReactFlow>
        </div>
      )}
      <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
        横位置はタスクの開始日で固定、縦方向にはドラッグして重なりを調整できるにゃ。ノード同士の丸をドラッグして接続すると依存関係になるにゃ。線を選択してDeleteキーで解除、ノードをダブルクリックで編集にゃ。
      </p>
    </div>
  );
}
