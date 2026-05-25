"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Bold, Code, Heading1, Heading2, ImageIcon, Italic, LinkIcon, List, ListOrdered, QrCode, Quote, Redo, Strikethrough, UnderlineIcon, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/client-api";

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
  const [dialog, setDialog] = useState<"link" | "image" | "qr" | null>(null);
  const [url, setUrl] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [qr, setQr] = useState({ campaignId: "", name: "", email: "", url: "", text: "", size: 200, align: "center", alt: "QR Code" });
  const editor = useEditor({
    extensions: [StarterKit, Underline, Link, Image, TextStyle, Color, TextAlign.configure({ types: ["heading", "paragraph"] })],
    content: value,
    editorProps: { attributes: { class: "prose-editor rounded-md border bg-background p-4 text-sm" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });
  useEffect(() => {
    apiFetch<{ campaigns: any[] }>("/api/qr/campaigns?isActive=true").then((data) => setCampaigns(data.campaigns)).catch(() => {});
  }, []);
  const selectedCampaign = campaigns.find((campaign) => campaign.id === qr.campaignId);
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
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => setDialog("qr")}><QrCode className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Insert QR</TooltipContent></Tooltip>
        </div>
      </TooltipProvider>
      <EditorContent editor={editor} />
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === "link" ? "Insert Link" : dialog === "image" ? "Insert Image" : "Insert QR Code"}</DialogTitle></DialogHeader>
          {dialog !== "qr" ? <div className="space-y-3">
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
          </div> : <div className="grid gap-3">
            <Label>Campaign<select className="mt-2 w-full rounded-md border bg-background p-2" value={qr.campaignId} onChange={(event) => setQr({ ...qr, campaignId: event.target.value })}><option value="">Select campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} ({campaign.type})</option>)}</select></Label>
            {selectedCampaign?.type === "checkin" && <><Label>Name<Input value={qr.name} onChange={(event) => setQr({ ...qr, name: event.target.value })} /></Label><Label>Email<Input value={qr.email} onChange={(event) => setQr({ ...qr, email: event.target.value })} /></Label></>}
            {selectedCampaign?.type === "url" && <Label>URL<Input placeholder="https://..." value={qr.url} onChange={(event) => setQr({ ...qr, url: event.target.value })} /></Label>}
            {selectedCampaign?.type === "text" && <Label>Text<Textarea maxLength={300} value={qr.text} onChange={(event) => setQr({ ...qr, text: event.target.value })} /></Label>}
            <div className="grid grid-cols-2 gap-3"><Label>Size<Input type="number" min={100} max={400} value={qr.size} onChange={(event) => setQr({ ...qr, size: Number(event.target.value) || 200 })} /></Label><Label>Alignment<select className="mt-2 w-full rounded-md border bg-background p-2" value={qr.align} onChange={(event) => setQr({ ...qr, align: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></Label></div>
            <Label>Alt text<Input value={qr.alt} onChange={(event) => setQr({ ...qr, alt: event.target.value })} /></Label>
            <Button
              disabled={!selectedCampaign}
              onClick={async () => {
                if (!selectedCampaign) return;
                const data = await apiFetch<{ qrCode: { imageUrl: string } }>("/api/qr/generate", {
                  method: "POST",
                  body: JSON.stringify({
                    campaignId: selectedCampaign.id,
                    contentType: selectedCampaign.type,
                    fields: { NAME: qr.name, EMAIL: qr.email },
                    url: qr.url,
                    text: qr.text,
                    recipientName: qr.name,
                    recipientEmail: qr.email
                  })
                });
                const margin = qr.align === "center" ? "0 auto" : qr.align === "right" ? "0 0 0 auto" : "0 auto 0 0";
                const src = `${process.env.NEXT_PUBLIC_APP_URL || ""}${data.qrCode.imageUrl}`;
                editor?.chain().focus().setImage({ src, alt: qr.alt, width: qr.size, height: qr.size, style: `display:block;margin:${margin};width:${qr.size}px;height:${qr.size}px;` } as any).run();
                setDialog(null);
              }}
            >
              Insert into Email
            </Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
