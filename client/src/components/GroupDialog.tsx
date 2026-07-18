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
import type { CreateGroupInput, Group, Project } from '@/types';

const PALETTE = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#14b8a6'];

interface Props {
  projects: Project[];
  group?: Group;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultProjectId?: string;
  onSubmit: (data: CreateGroupInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function GroupDialog({
  projects,
  group,
  trigger,
  open: controlledOpen,
  onOpenChange,
  defaultProjectId,
  onSubmit,
  onDelete,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [projectId, setProjectId] = useState(group?.project_id ?? defaultProjectId ?? projects[0]?.id ?? '');
  const [name, setName] = useState(group?.name ?? '');
  const [color, setColor] = useState(group?.color ?? PALETTE[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProjectId(group?.project_id ?? defaultProjectId ?? projects[0]?.id ?? '');
      setName(group?.name ?? '');
      setColor(group?.color ?? PALETTE[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit() {
    if (!name.trim() || !projectId) return;
    setSaving(true);
    try {
      await onSubmit({ project_id: projectId, name: name.trim(), color });
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
          <DialogTitle>{group ? 'グループを編集' : 'グループを追加'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
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
          <div className="grid gap-2">
            <Label htmlFor="group-name">名前</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 設計フェーズ"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
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
          {group && onDelete ? (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              削除
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSubmit} disabled={!name.trim() || !projectId || saving}>
            {group ? '保存' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
