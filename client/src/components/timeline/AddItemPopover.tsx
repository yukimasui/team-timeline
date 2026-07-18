interface Props {
  clientX: number;
  clientY: number;
  onPick: (kind: 'task' | 'event' | 'note') => void;
  onClose: () => void;
}

/** 空白クリック時に出すタスク/イベント/メモの選択ポップオーバー */
export function AddItemPopover({ clientX, clientY, onPick, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 flex flex-col gap-0.5 rounded-md border bg-background p-1 shadow-md"
        style={{ left: clientX, top: clientY }}
      >
        <button
          type="button"
          className="rounded px-2 py-1 text-left text-xs hover:bg-muted"
          onClick={() => onPick('task')}
        >
          + タスク
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-left text-xs hover:bg-muted"
          onClick={() => onPick('event')}
        >
          + イベント
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-left text-xs hover:bg-muted"
          onClick={() => onPick('note')}
        >
          + メモ
        </button>
      </div>
    </>
  );
}
