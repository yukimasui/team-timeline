import type { Project } from '@/types';
import type { ProjectBand } from './types';

interface Props {
  bands: ProjectBand[];
  projects: Project[];
  labelWidth: number;
  onOpenProject: (id: string) => void;
  onResizeStart: (projectId: string, startHeight: number, startClientY: number) => void;
}

/**
 * 左のプロジェクトラベル列。縦方向はReactFlowのパンを使わず、外側のスクロールコンテナに
 * 通常のドキュメントフローとして積み上げるだけ(各行の高さをbandの高さに合わせる)。
 * 横方向はReactFlowのパン対象外の領域にいるため、position指定なしでそのまま固定表示される。
 * 各行の下端にドラッグで高さを変えられるリサイズハンドルを持つ。
 */
export function ProjectLabelColumn({ bands, projects, labelWidth, onOpenProject, onResizeStart }: Props) {
  return (
    <div className="flex shrink-0 flex-col border-r bg-background" style={{ width: labelWidth }}>
      {bands.map((band) => {
        const project = projects.find((p) => p.id === band.projectId);
        if (!project) return null;
        const height = band.yEnd - band.yStart;
        return (
          <div key={band.projectId} className="relative border-b" style={{ height }}>
            <button
              type="button"
              onClick={() => onOpenProject(band.projectId)}
              className="flex h-full w-full items-start gap-2 overflow-hidden px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
            >
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="truncate">{project.name}</span>
            </button>
            <div
              role="separator"
              aria-orientation="horizontal"
              title="ドラッグして行の高さを変更"
              onMouseDown={(e) => {
                e.preventDefault();
                onResizeStart(band.projectId, height, e.clientY);
              }}
              className="absolute inset-x-0 bottom-0 z-10 h-2 hover:bg-primary/30"
              style={{ cursor: 'row-resize' }}
            />
          </div>
        );
      })}
    </div>
  );
}
