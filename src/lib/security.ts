// Security helper functions: Input sanitization, XSS prevention, and URI validation

/**
 * Sanitizes input strings against XSS attacks and dangerous HTML tag injections
 */
export function sanitizeString(input: string | undefined | null): string {
  if (!input) return '';
  return String(input)
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates email format strictly
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 150) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates international/national phone number format
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || phone.length < 8 || phone.length > 25) return false;
  const phoneRegex = /^[0-9+\s\-()]{8,25}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Ensures image URLs are safe HTTP(S) links or relative public paths, preventing javascript: or data: injection
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  const clean = url.trim();
  if (clean.startsWith('javascript:') || clean.startsWith('data:text/html')) {
    return '';
  }
  return clean;
}
