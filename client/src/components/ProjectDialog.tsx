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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateProjectInput, Member, Project } from '@/types';

const PALETTE = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#14b8a6'];
const NO_MEMBER = '__none__';

interface Props {
  members: Member[];
  project?: Project;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (data: CreateProjectInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ProjectDialog({
  members,
  project,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSubmit,
  onDelete,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState(project?.name ?? '');
  const [color, setColor] = useState(project?.color ?? PALETTE[0]);
  const [memberId, setMemberId] = useState(project?.member_id ?? NO_MEMBER);
  const [rowHeight, setRowHeight] = useState(project?.row_height ? String(project.row_height) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(project?.name ?? '');
      setColor(project?.color ?? PALETTE[0]);
      setMemberId(project?.member_id ?? NO_MEMBER);
      setRowHeight(project?.row_height ? String(project.row_height) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const parsedHeight = parseInt(rowHeight, 10);
      await onSubmit({
        name: name.trim(),
        color,
        member_id: memberId === NO_MEMBER ? '' : memberId,
        row_height: Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : 0,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? 'プロジェクトを編集' : 'プロジェクトを追加'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="project-name">名前</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 新機能開発"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="grid gap-2">
            <Label>デフォルト担当者(任意)</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="担当者なし" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MEMBER}>担当者なし</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">タイムライン上でこのプロジェクトのタスクを追加する際の初期担当者になるにゃ</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-row-height">タイムラインの行の高さ(px)</Label>
            <Input
              id="project-row-height"
              type="number"
              min={0}
              value={rowHeight}
              onChange={(e) => setRowHeight(e.target.value)}
              placeholder="自動"
            />
            <p className="text-xs text-muted-foreground">空欄(自動)にするとタスク数に応じて高さが決まるにゃ</p>
          </div>
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
        <DialogFooter className="gap-2 sm:justify-between">
          {project && onDelete ? (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              削除
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {project ? '保存' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
