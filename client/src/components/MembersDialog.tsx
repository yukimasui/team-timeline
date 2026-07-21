import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateMemberInput, Member, Task } from '@/types';

const PALETTE = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#14b8a6'];

interface Props {
  members: Member[];
  tasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateMemberInput) => Promise<void>;
  onUpdate: (id: string, data: CreateMemberInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function MembersDialog({ members, tasks, open, onOpenChange, onCreate, onUpdate, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const selectedMember = useMemo(() => members.find((m) => m.id === selectedId), [members, selectedId]);

  // ダイアログを開いたときは選択なしの一覧状態に戻す
  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setIsNew(false);
      setConfirmingDelete(false);
    }
  }, [open]);

  // 選択中メンバーが変わった/新規モードに入ったらフォームを再初期化
  useEffect(() => {
    if (isNew) {
      setName('');
      setColor(PALETTE[0]);
    } else if (selectedMember) {
      setName(selectedMember.name);
      setColor(selectedMember.color);
    }
    setConfirmingDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isNew]);

  function selectMember(id: string) {
    setIsNew(false);
    setSelectedId(id);
  }

  function startNew() {
    setSelectedId(null);
    setIsNew(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await onCreate({ name: name.trim(), color });
        setIsNew(false);
      } else if (selectedMember) {
        await onUpdate(selectedMember.id, { name: name.trim(), color });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedMember) return;
    setSaving(true);
    try {
      await onDelete(selectedMember.id);
      setSelectedId(null);
      setConfirmingDelete(false);
    } finally {
      setSaving(false);
    }
  }

  const showForm = isNew || Boolean(selectedMember);
  const taskCount = selectedMember ? tasks.filter((t) => t.member_id === selectedMember.id).length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>メンバー編集</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMember(m.id)}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm hover:bg-muted ${
                  !isNew && selectedId === m.id ? 'border-foreground bg-muted' : ''
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                {m.name}
              </button>
            ))}
            <button
              type="button"
              onClick={startNew}
              className={`rounded-md border px-2 py-1.5 text-sm hover:bg-muted ${isNew ? 'border-foreground bg-muted' : ''}`}
            >
              + 追加
            </button>
          </div>

          <div className="border-t" />

          {showForm ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="member-name">名前</Label>
                <Input
                  id="member-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 田中"
                  onKeyDown={(e) => e.key === 'Enter' && !confirmingDelete && handleSave()}
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
              {/* メンバーを消すと担当タスクもDBのON DELETE CASCADEで巻き添えになるため確認を挟む */}
              {confirmingDelete && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {taskCount > 0
                    ? `このメンバーが担当するタスク ${taskCount} 件も一緒に削除されます。元に戻せません。`
                    : 'このメンバーを削除します。元に戻せません。'}
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                {!isNew && selectedMember ? (
                  confirmingDelete ? (
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                        削除する
                      </Button>
                      <Button variant="outline" onClick={() => setConfirmingDelete(false)} disabled={saving}>
                        やめる
                      </Button>
                    </div>
                  ) : (
                    <Button variant="destructive" onClick={() => setConfirmingDelete(true)} disabled={saving}>
                      削除
                    </Button>
                  )
                ) : (
                  <span />
                )}
                <Button onClick={handleSave} disabled={!name.trim() || saving || confirmingDelete}>
                  {isNew ? '追加' : '保存'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">編集したいメンバーを選んでほしいにゃ</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
