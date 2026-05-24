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
  try {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-same-origin");
    frame.style.position = "fixed";
    frame.style.left = "-10000px";
    frame.style.top = "0";
    frame.style.width = "640px";
    frame.style.height = "400px";
    frame.style.background = "white";
    document.body.appendChild(frame);
    frame.srcdoc = bodyHtml;
    await new Promise((resolve) => {
      frame.onload = resolve;
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
    frame.remove();
    return canvas.toDataURL("image/png");
  } catch {
    return TEMPLATE_THUMBNAIL_PLACEHOLDER;
  }
}

export function replaceTemplateValues(input: string, values: Record<string, string>) {
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}
