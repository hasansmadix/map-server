/** Strip HTML tags and normalize whitespace for plain-text storage. */
export function normalizePlainText(input: string, maxLength?: number): string {
  const stripped = input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (maxLength && stripped.length > maxLength) {
    return stripped.slice(0, maxLength);
  }
  return stripped;
}

export function cleanTrackingValue(val: string): string {
  const trimmed = val.trim();
  if (/^\{[a-z_]+\}$/i.test(trimmed)) return '';
  if (/^\{\{[\w.]+\}\}$/.test(trimmed)) return '';
  return trimmed;
}

export function truncate(val: string | null | undefined, max: number): string | null {
  if (!val) return null;
  const cleaned = cleanTrackingValue(val);
  if (!cleaned) return null;
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}
