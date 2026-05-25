export function detectQrPlaceholders(htmlString: string) {
  return Array.from(new Set(Array.from(htmlString.matchAll(/\{\{\s*(qr_[a-z_]+)\s*\}\}/g)).map((match) => match[1])));
}

export function isQrPlaceholder(srcValue: string) {
  return /^\{\{qr_[a-z_]+\}\}$/.test(srcValue.trim());
}
