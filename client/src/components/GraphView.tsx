import { useCallback, useEffect } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Member, Task } from '@/types';
import { memberOf } from '@/utils';
import { TaskNode, type TaskNodeData } from './TaskNode';

const nodeTypes = { task: TaskNode };

interface Props {
  members: Member[];
  tasks: Task[];
  onAddDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onRemoveDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  onMoveNode: (taskId: string, x: number, y: number) => Promise<void>;
  onOpenTask: (taskId: string) => void;
}

export function GraphView({ members, tasks, onAddDependency, onRemoveDependency, onMoveNode, onOpenTask }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TaskNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(
      tasks.map((t, i) => {
        const member = memberOf(members, t.member_id);
        const hasSavedPosition = t.node_x !== 0 || t.node_y !== 0;
        const position = hasSavedPosition
          ? { x: t.node_x, y: t.node_y }
          : { x: (i % 4) * 240 + 40, y: Math.floor(i / 4) * 160 + 40 };
        return {
          id: t.id,
          type: 'task',
          position,
          data: {
            title: t.title,
            status: t.status,
            memberName: member?.name ?? '',
            memberColor: member?.color ?? '#999999',
          } satisfies TaskNodeData,
        };
      }),
    );
  }, [tasks, members, setNodes]);

  useEffect(() => {
    const next: Edge[] = [];
    for (const t of tasks) {
      for (const depId of t.depends_on) {
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
  }, [tasks, setEdges]);

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

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
        <p>タスクを追加すると、ノードをドラッグで繋いで依存関係を作れるにゃ</p>
      </div>
    );
  }

  return (
    <div className="h-[70vh] rounded-lg border">
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
      </ReactFlow>
      <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
        ノード同士の丸をドラッグして接続すると依存関係になるにゃ。線を選択してDeleteキーで解除、ノードをダブルクリックで編集にゃ。
      </p>
    </div>
  );
}
