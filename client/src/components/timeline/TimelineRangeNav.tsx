import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type DateRange, yearOf, yearRange } from './dateRange';

interface Props {
  range: DateRange;
  onChange: (range: DateRange) => void;
}

export function TimelineRangeNav({ range, onChange }: Props) {
  const year = yearOf(range);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(yearRange(year - 1))}
        aria-label="前年へ"
      >
        <ChevronLeftIcon />
      </Button>
      <span className="flex h-7 items-center px-1 text-[0.8rem] font-medium tabular-nums">{year}年</span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(yearRange(year + 1))}
        aria-label="翌年へ"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
