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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateTaskInput, Member, Status, Task, UpdateTaskInput } from '@/types';
import { STATUS_LABEL, STATUS_ORDER, todayStr } from '@/utils';

interface Props {
  members: Member[];
  tasks: Task[];
  task?: Task;
  trigger?: ReactNode;
  defaultMemberId?: string;
  onSubmit: (data: CreateTaskInput | UpdateTaskInput, dependsOn: string[]) => Promise<void>;
  onDelete?: () => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TaskDialog({
  members,
  tasks,
  task,
  trigger,
  defaultMemberId,
  onSubmit,
  onDelete,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [title, setTitle] = useState(task?.title ?? '');
  const [memberId, setMemberId] = useState(task?.member_id ?? defaultMemberId ?? members[0]?.id ?? '');
  const [status, setStatus] = useState<Status>(task?.status ?? 'todo');
  const [startDate, setStartDate] = useState(task?.start_date ?? todayStr());
  const [endDate, setEndDate] = useState(task?.end_date ?? todayStr());
  const [description, setDescription] = useState(task?.description ?? '');
  const [dependsOn, setDependsOn] = useState<string[]>(task?.depends_on ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '');
      setMemberId(task?.member_id ?? defaultMemberId ?? members[0]?.id ?? '');
      setStatus(task?.status ?? 'todo');
      setStartDate(task?.start_date ?? todayStr());
      setEndDate(task?.end_date ?? todayStr());
      setDescription(task?.description ?? '');
      setDependsOn(task?.depends_on ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleDep(id: string) {
    setDependsOn((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!title.trim() || !memberId) return;
    setSaving(true);
    try {
      await onSubmit(
        {
          member_id: memberId,
          title: title.trim(),
          description,
          status,
          start_date: startDate,
          end_date: endDate < startDate ? startDate : endDate,
        },
        dependsOn,
      );
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

  const otherTasks = tasks.filter((t) => t.id !== task?.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'タスクを編集' : 'タスクを追加'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="task-title">タイトル</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 設計レビュー" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>担当者</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="担当者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>ステータス</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-start">開始日</Label>
              <Input id="task-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-end">終了日</Label>
              <Input id="task-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-desc">メモ</Label>
            <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          {otherTasks.length > 0 && (
            <div className="grid gap-2">
              <Label>依存先タスク(先に終わらせる必要があるタスク)</Label>
              <div className="max-h-32 overflow-y-auto rounded-md border p-2">
                {otherTasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={dependsOn.includes(t.id)} onChange={() => toggleDep(t.id)} />
                    {t.title}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {task && onDelete ? (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              削除
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSubmit} disabled={!title.trim() || saving}>
            {task ? '保存' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
