import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MemoField } from '@/components/MemoField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateMarkerInput, Marker, MarkerType, Project, UpdateMarkerInput } from '@/types';
import { todayStr } from '@/utils';

const PALETTE = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#14b8a6'];

const ITEM_TYPE_LABEL: Record<MarkerType, string> = {
  event: 'イベント',
  note: 'メモ',
};

interface Props {
  projects: Project[];
  marker?: Marker;
  trigger?: ReactNode;
  defaultProjectId?: string;
  defaultDate?: string;
  defaultItemType?: MarkerType;
  onSubmit: (data: CreateMarkerInput | UpdateMarkerInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EventDialog({
  projects,
  marker,
  trigger,
  defaultProjectId,
  defaultDate,
  defaultItemType,
  onSubmit,
  onDelete,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [title, setTitle] = useState(marker?.title ?? '');
  const [projectId, setProjectId] = useState(marker?.project_id ?? defaultProjectId ?? projects[0]?.id ?? '');
  const [itemType, setItemType] = useState<MarkerType>(marker?.item_type ?? defaultItemType ?? 'event');
  const [startDate, setStartDate] = useState(marker?.start_date ?? defaultDate ?? todayStr());
  const [endDate, setEndDate] = useState(marker?.end_date ?? marker?.start_date ?? defaultDate ?? todayStr());
  const [color, setColor] = useState(marker?.color ?? PALETTE[0]);
  const [description, setDescription] = useState(marker?.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(marker?.title ?? '');
      setProjectId(marker?.project_id ?? defaultProjectId ?? projects[0]?.id ?? '');
      setItemType(marker?.item_type ?? defaultItemType ?? 'event');
      setStartDate(marker?.start_date ?? defaultDate ?? todayStr());
      setEndDate(marker?.end_date ?? marker?.start_date ?? defaultDate ?? todayStr());
      setColor(marker?.color ?? PALETTE[0]);
      setDescription(marker?.description ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit() {
    if (!title.trim() || !projectId) return;
    setSaving(true);
    try {
      await onSubmit({
        project_id: projectId,
        item_type: itemType,
        title: title.trim(),
        description,
        color,
        start_date: startDate,
        end_date: itemType === 'note' ? '' : endDate < startDate ? startDate : endDate,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{marker ? `${ITEM_TYPE_LABEL[itemType]}を編集` : 'イベント/メモを追加'}</DialogTitle>
        </DialogHeader>
        <div className="grid flex-1 grid-cols-1 gap-4 py-2 sm:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>種別</Label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as MarkerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">イベント</SelectItem>
                  <SelectItem value="note">メモ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>プロジェクト</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="プロジェクトを選択" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="marker-title">タイトル</Label>
            <Input
              id="marker-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={itemType === 'note' ? '例: 進捗共有メモ' : '例: リリース'}
            />
          </div>

          {itemType === 'event' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="marker-start">開始日</Label>
                <Input
                  id="marker-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="marker-end">終了日</Label>
                <Input id="marker-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>カラー</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: c === color ? 'var(--foreground)' : 'transparent',
                    transform: c === color ? 'scale(1.1)' : undefined,
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

        </div>
        <MemoField id="marker-desc" value={description} onChange={setDescription} />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {marker && onDelete ? (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              削除
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSubmit} disabled={!title.trim() || !projectId || saving}>
            {marker ? '保存' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
