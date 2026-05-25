import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type CertField = {
  id: string;
  placeholder: string;
  label: string;
  defaultValue: string;
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  alignment: "left" | "center" | "right";
};

export type GenerateCertOptions = {
  pdfBase64: string;
  fields: CertField[];
  mergeData: Record<string, string>;
};

type TextPosition = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function parseCertFields(value: string | null | undefined): CertField[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(normalizeCertField) : [];
  } catch {
    return [];
  }
}

export function normalizeCertField(field: Partial<CertField> & { placeholder?: string }): CertField {
  const placeholder = String(field.placeholder || "").trim();
  return {
    id: String(field.id || crypto.randomUUID()),
    placeholder,
    label: String(field.label || labelFromPlaceholder(placeholder)),
    defaultValue: String(field.defaultValue || ""),
    fontSize: Number(field.fontSize) || 24,
    color: /^#[0-9a-f]{6}$/i.test(String(field.color || "")) ? String(field.color) : "#000000",
    isBold: Boolean(field.isBold),
    isItalic: Boolean(field.isItalic),
    alignment: field.alignment === "center" || field.alignment === "right" ? field.alignment : "left"
  };
}

export function labelFromPlaceholder(placeholder: string) {
  return placeholder
    .replace(/[{}[\]]/g, "")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function extractPdfInfo(pdfBase64: string): Promise<{ pageCount: number; pageWidth: number; pageHeight: number }> {
  const pdfBytes = Buffer.from(pdfBase64, "base64");
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const firstPage = pdfDoc.getPages()[0];
  if (!firstPage) throw new Error("PDF has no pages");
  const { width, height } = firstPage.getSize();
  return {
    pageCount: pdfDoc.getPageCount(),
    pageWidth: width,
    pageHeight: height
  };
}

export async function detectPlaceholders(pdfBase64: string): Promise<string[]> {
  let text = "";
  try {
    text = await extractPdfText(pdfBase64);
  } catch (error) {
    console.warn("PDF placeholder detection failed:", error);
    return [];
  }
  if (!text.trim()) return [];

  const placeholders = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([A-Z][A-Z0-9_]{1,})\s*\}\}/g)) placeholders.add(match[1]);
  for (const match of text.matchAll(/\[\s*([A-Z][A-Z0-9_]{1,})\s*\]/g)) placeholders.add(match[1]);
  for (const match of text.matchAll(/\b([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+|[A-Z]{3,})\b/g)) placeholders.add(match[1]);
  return Array.from(placeholders);
}

export async function generateCertificate(options: GenerateCertOptions): Promise<Buffer> {
  const pdfBytes = Buffer.from(options.pdfBase64, "base64");
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const boldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const pages = pdfDoc.getPages();

  for (const field of options.fields) {
    const value =
      options.mergeData[field.placeholder] ||
      options.mergeData[field.placeholder.toLowerCase()] ||
      options.mergeData[`{{${field.placeholder}}}`] ||
      field.defaultValue ||
      "";
    if (!value) continue;

    const font = field.isBold && field.isItalic ? boldItalicFont : field.isBold ? boldFont : field.isItalic ? italicFont : regularFont;
    const [r, g, b] = hexToRgb(field.color);
    const textPositions = await findTextInDocument(options.pdfBase64, field.placeholder);

    for (const pos of textPositions) {
      const page = pages[pos.pageIndex];
      if (!page) continue;
      page.drawRectangle({
        x: pos.x - 2,
        y: pos.y - 2,
        width: pos.width + 4,
        height: pos.height + 4,
        color: rgb(1, 1, 1),
        opacity: 1
      });

      const textWidth = font.widthOfTextAtSize(value, field.fontSize);
      let drawX = pos.x;
      if (field.alignment === "center") drawX = pos.x + pos.width / 2 - textWidth / 2;
      if (field.alignment === "right") drawX = pos.x + pos.width - textWidth;

      page.drawText(value, {
        x: drawX,
        y: pos.y,
        size: field.fontSize,
        font,
        color: rgb(r, g, b)
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

export async function findTextInPage(
  page: PDFPage,
  searchText: string
): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
  const doc = (page as unknown as { doc?: PDFDocument }).doc;
  if (!doc) return [];
  const pages = doc.getPages();
  const pageIndex = pages.findIndex((candidate) => candidate === page);
  const positions = await findTextInDocument(Buffer.from(await doc.save()).toString("base64"), searchText);
  return positions.filter((position) => position.pageIndex === pageIndex).map((position) => ({
    x: position.x,
    y: position.y,
    width: position.width,
    height: position.height
  }));
}

export async function generatePdfPreview(pdfBase64: string): Promise<string | null> {
  try {
    const { createCanvas } = await (new Function("return import('canvas')")() as Promise<{ createCanvas: (width: number, height: number) => any }>);
    const pdfjsLib = await getPdfjs();
    const pdfData = Buffer.from(pdfBase64, "base64");
    const pdf = await loadPdfDocument(pdfjsLib, pdfData);
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await (page as any).render({ canvasContext: context, canvas, viewport }).promise;
    return canvas.toDataURL("image/png").replace("data:image/png;base64,", "");
  } catch {
    return null;
  }
}

async function extractPdfText(pdfBase64: string) {
  const pdfjsLib = await getPdfjs();
  const pdfData = Buffer.from(pdfBase64, "base64");
  const pdf = await loadPdfDocument(pdfjsLib, pdfData);
  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if ("str" in item) parts.push(String(item.str));
    }
  }
  return parts.join(" ");
}

async function findTextInDocument(pdfBase64: string, searchText: string): Promise<TextPosition[]> {
  const pdfjsLib = await getPdfjs();
  const pdfData = Buffer.from(pdfBase64, "base64");
  const pdf = await loadPdfDocument(pdfjsLib, pdfData);
  const matches: TextPosition[] = [];
  const needles = Array.from(new Set([searchText, `{{${searchText}}}`, `[${searchText}]`]));

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      const str = String(item.str);
      if (!needles.some((needle) => str.includes(needle))) continue;
      const transform = item.transform as number[];
      matches.push({
        pageIndex: pageNum - 1,
        x: transform[4],
        y: transform[5],
        width: Number(item.width) || str.length * 8,
        height: Number(item.height) || Math.abs(transform[3]) || 16
      });
    }
  }

  return matches;
}

function hexToRgb(color: string) {
  const hex = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : "000000";
  return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255] as const;
}

async function getPdfjs() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
  return pdfjsLib;
}

function loadPdfDocument(pdfjsLib: Awaited<ReturnType<typeof getPdfjs>>, pdfData: Buffer) {
  return pdfjsLib.getDocument({
    data: new Uint8Array(pdfData),
    isEvalSupported: false
  } as any).promise;
}
