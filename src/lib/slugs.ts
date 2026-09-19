/**
 * Utility to convert event titles into URL-friendly slugs and generate registration URLs.
 * Supports English, French, and Arabic character normalization.
 */

export function slugify(text: string): string {
  if (!text) return 'event';
  
  return text
    .toString()
    .trim()
    .toLowerCase()
    // Replace accented characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace whitespace and punctuation with single hyphens, keeping arabic and alphanumeric chars
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens
    .replace(/-{2,}/g, '-') || 'event';
}

export function getEventRegistrationUrl(event: { id: number | string; title?: string }): string {
  const slug = event.title ? slugify(event.title) : String(event.id);
  return `#/events/${slug}/register`;
}

export function getEventRegistrationFullUrl(event: { id: number | string; title?: string }): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '';
  return `${origin}${pathname}/${getEventRegistrationUrl(event)}`;
}
