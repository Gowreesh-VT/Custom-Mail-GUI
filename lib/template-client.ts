"use client";

import html2canvas from "html2canvas";
import { detectTemplateFields, validateExternalImageUrls } from "@/lib/template-html";

export const TEMPLATE_THUMBNAIL_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#f4f4f5"/>
      <rect x="56" y="48" width="528" height="64" rx="8" fill="#ffffff"/>
      <rect x="56" y="136" width="360" height="20" rx="4" fill="#d4d4d8"/>
      <rect x="56" y="176" width="480" height="16" rx="4" fill="#e4e4e7"/>
      <rect x="56" y="204" width="430" height="16" rx="4" fill="#e4e4e7"/>
      <rect x="56" y="260" width="160" height="44" rx="8" fill="#0f766e"/>
      <text x="320" y="355" text-anchor="middle" font-family="Arial" font-size="24" fill="#71717a">HTML Template</text>
    </svg>`
  );

export function validateHtmlTemplateClient(bodyHtml: string) {
  return {
    invalidImages: validateExternalImageUrls(bodyHtml),
    mergeFields: detectTemplateFields("", bodyHtml)
  };
}

export async function generateTemplateThumbnail(bodyHtml: string) {
  let frame: HTMLIFrameElement | null = null;
  try {
    const generatePromise = (async () => {
      frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-same-origin");
      frame.style.position = "fixed";
      frame.style.left = "-10000px";
      frame.style.top = "0";
      frame.style.width = "640px";
      frame.style.height = "400px";
      frame.style.background = "white";
      document.body.appendChild(frame);
      frame.srcdoc = replaceQrPlaceholdersForPreview(bodyHtml);
      await new Promise((resolve) => {
        if (frame) frame.onload = resolve;
        setTimeout(resolve, 1200);
      });
      const doc = frame.contentDocument;
      if (!doc?.documentElement) throw new Error("Preview frame unavailable");
      const canvas = await html2canvas(doc.documentElement, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        width: 640,
        height: 400,
        windowWidth: 640,
        windowHeight: 400
      });
      return canvas.toDataURL("image/png");
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Thumbnail generation timed out")), 4000)
    );

    const result = await Promise.race([generatePromise, timeoutPromise]);
    if (frame) frame.remove();
    return result;
  } catch (error) {
    console.error("Thumbnail generation failed or timed out:", error);
    if (frame) {
      try {
        frame.remove();
      } catch {}
    }
    return TEMPLATE_THUMBNAIL_PLACEHOLDER;
  }
}

export function replaceTemplateValues(input: string, values: Record<string, string>) {
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}

export function replaceQrPlaceholdersForPreview(html: string) {
  const placeholderFor = (width = "200", height = width) => `<div style="
      width: ${width}px;
      height: ${height}px;
      background: #f0f0f0;
      border: 2px dashed #999;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      font-family: monospace;
      font-size: 11px;
      color: #666;
      text-align: center;
      gap: 8px;
    ">
      <svg width="40" height="40" viewBox="0 0 24 24"
        fill="none" stroke="#999" stroke-width="1.5">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <rect x="14" y="14" width="3" height="3"/>
      </svg>
      QR Code Preview<br/>
      <span style="color:#aaa;font-size:10px;">
        Generated on send
      </span>
    </div>`;

  return html.replace(/<img\b([^>]*?)src=(["'])\{\{(qr_[a-z_]+)\}\}\2([^>]*)>/gi, (_tag, before, _quote, _name, after) => {
    const width = /width=(["']?)(\d+)/i.exec(`${before} ${after}`)?.[2] || "200";
    const height = /height=(["']?)(\d+)/i.exec(`${before} ${after}`)?.[2] || width;
    return placeholderFor(width, height);
  }).replace(/\{\{\s*qr_[a-z_]+\s*\}\}/g, placeholderFor());
}
