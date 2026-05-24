"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Bold, Code, Heading1, Heading2, ImageIcon, Italic, LinkIcon, List, ListOrdered, Quote, Redo, Strikethrough, UnderlineIcon, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const tools = [
  ["Bold", Bold, (e: any) => e.chain().focus().toggleBold().run()],
  ["Italic", Italic, (e: any) => e.chain().focus().toggleItalic().run()],
  ["Underline", UnderlineIcon, (e: any) => e.chain().focus().toggleUnderline().run()],
  ["Strike", Strikethrough, (e: any) => e.chain().focus().toggleStrike().run()],
  ["H1", Heading1, (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run()],
  ["H2", Heading2, (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run()],
  ["Bullet list", List, (e: any) => e.chain().focus().toggleBulletList().run()],
  ["Ordered list", ListOrdered, (e: any) => e.chain().focus().toggleOrderedList().run()],
  ["Quote", Quote, (e: any) => e.chain().focus().toggleBlockquote().run()],
  ["Code block", Code, (e: any) => e.chain().focus().toggleCodeBlock().run()],
  ["Undo", Undo, (e: any) => e.chain().focus().undo().run()],
  ["Redo", Redo, (e: any) => e.chain().focus().redo().run()]
] as const;

export function RichEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [dialog, setDialog] = useState<"link" | "image" | null>(null);
  const [url, setUrl] = useState("");
  const editor = useEditor({
    extensions: [StarterKit, Underline, Link, Image, TextStyle, Color, TextAlign.configure({ types: ["heading", "paragraph"] })],
    content: value,
    editorProps: { attributes: { class: "prose-editor rounded-md border bg-background p-4 text-sm" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });
  return (
    <div className="space-y-2">
      <TooltipProvider>
        <div className="flex flex-wrap gap-1 rounded-md border bg-card p-1">
          {tools.map(([label, Icon, action]) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor && action(editor)}><Icon className="h-4 w-4" /></Button></TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => { setDialog("link"); setUrl(""); }}><LinkIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Link</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => { setDialog("image"); setUrl(""); }}><ImageIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Image</TooltipContent></Tooltip>
        </div>
      </TooltipProvider>
      <EditorContent editor={editor} />
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === "link" ? "Insert Link" : "Insert Image"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" />
            <Button
              type="button"
              onClick={() => {
                if (dialog === "link") editor?.chain().focus().setLink({ href: url }).run();
                if (dialog === "image") editor?.chain().focus().setImage({ src: url }).run();
                setDialog(null);
              }}
            >
              Insert
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
