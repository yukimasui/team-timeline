import { useViewport } from '@xyflow/react';
import type { ProjectBand } from './types';

interface Props {
  bands: ProjectBand[];
}

/** プロジェクト行の背景帯(交互の薄い塗り+下境界線)。装飾のみでpointer-eventsは持たない */
export function ProjectBandBackground({ bands }: Props) {
  const { y: panY, zoom } = useViewport();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bands.map((band, i) => (
        <div
          key={band.projectId}
          className={`absolute inset-x-0 border-b ${i % 2 === 0 ? 'bg-muted/20' : ''}`}
          style={{ top: band.yStart * zoom + panY, height: (band.yEnd - band.yStart) * zoom }}
        />
      ))}
    </div>
  );
}
