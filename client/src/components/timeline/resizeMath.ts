import type { ResizeParams } from '@xyflow/react';
import { addDays } from '@/utils';
import { DAY_WIDTH } from './constants';

/**
 * リサイズ確定時の絶対x/widthから、変更後の日付を1つ算出する。
 * left: 動いた左端(x)からstart_dateを算出。right: 幅からend_dateを算出(anchorDateはstart_date)。
 */
export function dateFromResize(
  edge: 'left' | 'right',
  params: ResizeParams,
  rangeStart: string,
  anchorDate: string,
): string {
  if (edge === 'left') {
    return addDays(rangeStart, Math.round(params.x / DAY_WIDTH));
  }
  const span = Math.max(Math.round((params.width + 4) / DAY_WIDTH), 1);
  return addDays(anchorDate, span - 1);
}
