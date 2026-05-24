import { applyMergeFields, extractMergeFields } from "@/lib/utils";

export interface InvalidImageReference {
  line: number;
  tag: string;
  src: string;
}

export function detectTemplateFields(subjectLine: string, bodyHtml: string) {
  return extractMergeFields(`${subjectLine}\n${bodyHtml}`);
}

export function renderTemplateHtml(input: string, values: Record<string, string>) {
  return applyMergeFields(input, values);
}

export function validateExternalImageUrls(bodyHtml: string): InvalidImageReference[] {
  const invalid: InvalidImageReference[] = [];
  const imageRegex = /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gis;
  for (const match of bodyHtml.matchAll(imageRegex)) {
    const tag = match[0];
    const src = match[2]?.trim() || "";
    if (!src.toLowerCase().startsWith("https://")) {
      invalid.push({
        line: lineForIndex(bodyHtml, match.index || 0),
        tag: compactTag(tag),
        src
      });
    }
  }
  return invalid;
}

export function formatInvalidImagesMessage(invalidImages: InvalidImageReference[]) {
  const plural = invalidImages.length === 1 ? "image" : "images";
  return `Found ${invalidImages.length} ${plural} with non-external URLs:\n${invalidImages
    .map((item) => `line ${item.line}: ${item.tag}`)
    .join("\n")}`;
}

export function isValidHtmlTemplate(bodyHtml: string) {
  return bodyHtml.trim().length > 0 && /<\/?[a-z][\s\S]*>/i.test(bodyHtml);
}

function lineForIndex(input: string, index: number) {
  return input.slice(0, index).split(/\r\n|\r|\n/).length;
}

function compactTag(tag: string) {
  return tag.replace(/\s+/g, " ").trim();
}
