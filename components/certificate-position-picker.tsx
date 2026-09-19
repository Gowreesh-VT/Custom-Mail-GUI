"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CertBox = { pageIndex: number; x: number; y: number; width: number; height: number };

type PickerField = {
  id: string;
  placeholder: string;
  label: string;
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  alignment: "left" | "center" | "right";
  defaultValue: string;
  box?: CertBox;
};

type Props = {
  pdfBase64: string;
  fields: PickerField[];
  sampleData: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBoxChange: (id: string, box: CertBox) => void;
};

export function CertificatePositionPicker({ pdfBase64, fields, sampleData, selectedId, onSelect, onBoxChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(1);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const bytes = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0));
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const page = await pdf.getPage(Math.min(pageIndex, pdf.numPages - 1) + 1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        if (!cancelled) {
          setPageSize({ width: base.width, height: base.height });
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not render PDF");
      }
    })();
    return () => { cancelled = true; };
  }, [pdfBase64, pageIndex]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !pageSize) return;
    const update = () => setScale(surface.clientWidth / pageSize.width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(surface);
    return () => observer.disconnect();
  }, [pageSize]);

  // Mirrors generateCertificate: shrink the text until it fits the box width.
  function fitSize(field: PickerField, value: string) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !field.box) return field.fontSize;
    const face = (size: number) => `${field.isItalic ? "italic " : ""}${field.isBold ? "bold " : ""}${size}px Helvetica, Arial, sans-serif`;
    ctx.font = face(field.fontSize);
    const width = ctx.measureText(value).width;
    return width > field.box.width ? Math.max(6, (field.fontSize * field.box.width) / width) : field.fontSize;
  }

  function fraction(event: React.PointerEvent) {
    const rect = surfaceRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    };
  }

  function onPointerDown(event: React.PointerEvent) {
    if (!selectedId) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = fraction(event);
    setDraft({ x0: x, y0: y, x1: x, y1: y });
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!draft) return;
    const { x, y } = fraction(event);
    setDraft({ ...draft, x1: x, y1: y });
  }

  function onPointerUp() {
    if (!draft || !selectedId || !pageSize) return setDraft(null);
    const left = Math.min(draft.x0, draft.x1);
    const right = Math.max(draft.x0, draft.x1);
    const top = Math.min(draft.y0, draft.y1);
    const bottom = Math.max(draft.y0, draft.y1);
    setDraft(null);
    const width = (right - left) * pageSize.width;
    const height = (bottom - top) * pageSize.height;
    if (width < 8 || height < 8) return; // ignore accidental clicks
    onBoxChange(selectedId, {
      pageIndex,
      x: left * pageSize.width,
      y: pageSize.height - bottom * pageSize.height,
      width,
      height
    });
  }

  const selected = fields.find((field) => field.id === selectedId);
  const boxStyle = (box: CertBox) => pageSize ? {
    left: `${(box.x / pageSize.width) * 100}%`,
    top: `${((pageSize.height - box.y - box.height) / pageSize.height) * 100}%`,
    width: `${(box.width / pageSize.width) * 100}%`,
    height: `${(box.height / pageSize.height) * 100}%`
  } : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>Certificate</span>
          {pageCount > 1 && (
            <span className="flex items-center gap-2 text-sm font-normal">
              <Button size="sm" variant="outline" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>Prev</Button>
              Page {pageIndex + 1} / {pageCount}
              <Button size="sm" variant="outline" disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex(pageIndex + 1)}>Next</Button>
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {selected ? <>Drag on the page to place <b>{selected.label || selected.placeholder}</b>.</> : "Select a field on the left, then drag on the page to place it. Boxes show your sample data live."}
        </p>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div
          ref={surfaceRef}
          className={`relative w-full select-none overflow-hidden rounded-md border ${selectedId ? "cursor-crosshair" : ""}`}
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <canvas ref={canvasRef} className="block h-auto w-full" />
          {fields.filter((field) => field.box && field.box.pageIndex === pageIndex).map((field) => (
            <div
              key={field.id}
              className={`pointer-events-none absolute border-2 ${field.id === selectedId ? "border-emerald-400 bg-emerald-400/20" : "border-sky-400 bg-sky-400/10"}`}
              style={boxStyle(field.box!)}
            >
              <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-black/70 px-1 text-[10px] text-white">{field.label || field.placeholder}</span>
              {(() => {
                const value = sampleData[field.placeholder] || field.defaultValue || field.label || field.placeholder;
                return (
                  <div className="flex h-full w-full items-center overflow-hidden" style={{ justifyContent: field.alignment === "center" ? "center" : field.alignment === "right" ? "flex-end" : "flex-start" }}>
                    <span style={{
                      fontFamily: "Helvetica, Arial, sans-serif",
                      fontSize: fitSize(field, value) * scale,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      color: field.color,
                      fontWeight: field.isBold ? 700 : 400,
                      fontStyle: field.isItalic ? "italic" : "normal"
                    }}>{value}</span>
                  </div>
                );
              })()}
            </div>
          ))}
          {draft && (
            <div
              className="pointer-events-none absolute border-2 border-dashed border-emerald-400 bg-emerald-400/20"
              style={{
                left: `${Math.min(draft.x0, draft.x1) * 100}%`,
                top: `${Math.min(draft.y0, draft.y1) * 100}%`,
                width: `${Math.abs(draft.x1 - draft.x0) * 100}%`,
                height: `${Math.abs(draft.y1 - draft.y0) * 100}%`
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
