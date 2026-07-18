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
import type { CreateTimelineInput, Project, Timeline } from '@/types';

interface Props {
  projects: Project[];
  timeline?: Timeline;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (data: CreateTimelineInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function TimelineDialog({
  projects,
  timeline,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSubmit,
  onDelete,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState(timeline?.name ?? '');
  const [projectIds, setProjectIds] = useState<string[]>(timeline?.project_ids ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(timeline?.name ?? '');
      setProjectIds(timeline?.project_ids ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleProject(id: string) {
    setProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), project_ids: projectIds });
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
          <DialogTitle>{timeline ? 'タイムラインを編集' : 'タイムラインを追加'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="timeline-name">名前</Label>
            <Input
              id="timeline-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 開発チーム"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="grid gap-2">
            <Label>表示するプロジェクト</Label>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">プロジェクトがまだないにゃ</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                {projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={projectIds.includes(p.id)} onChange={() => toggleProject(p.id)} />
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {timeline && onDelete ? (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              削除
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {timeline ? '保存' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
