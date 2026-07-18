import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

const markdownComponents: Components = {
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

/** タスク/イベント・メモダイアログ共通のメモ欄。編集(プレーンテキスト)とプレビュー(Markdown)を切り替えられる */
export function MemoField({ id, value, onChange }: Props) {
  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>メモ</Label>
      <Tabs defaultValue="preview" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="edit">編集</TabsTrigger>
          <TabsTrigger value="preview">プレビュー</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="min-h-0">
          <Textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-full min-h-40 resize-none"
          />
        </TabsContent>
        <TabsContent value="preview" className="min-h-0 overflow-y-auto rounded-md border px-2.5 py-2">
          {value.trim() ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">(メモがありません)</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
