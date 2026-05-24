import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function jsonError(error: string, status = 400, code?: string) {
  return Response.json({ success: false, error, code }, { status });
}

export function parseList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return (value || "")
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractMergeFields(input: string): string[] {
  return Array.from(new Set(Array.from(input.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)).map((match) => match[1])));
}

export function applyMergeFields(input: string, data: Record<string, string>) {
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => data[key] ?? "");
}
