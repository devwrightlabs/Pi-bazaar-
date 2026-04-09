/**
 * Input Sanitization Utility — SERVER-SIDE
 *
 * Strips HTML tags and dangerous patterns from user-supplied strings before
 * they are stored in the database. This provides a defence-in-depth layer
 * against Stored XSS even if the frontend renders content without escaping.
 *
 * Does NOT alter strings that are already plain text (no tags).
 */

// Regex that matches HTML/XML tags (opening, closing, self-closing, comments)
const HTML_TAG_RE = /(<([^>]+)>)/gi

// Matches common JS event handler patterns that could survive after tag stripping
const EVENT_HANDLER_RE = /\bon\w+\s*=/gi

// Matches javascript: or data: URIs used in injection attacks
const DANGEROUS_URI_RE = /(?:javascript|data)\s*:/gi

/**
 * Strips HTML tags and neutralises common XSS vectors from a single string.
 *
 * @param input — Raw user input
 * @returns Sanitized plain-text string
 */
export function stripHtml(input: string): string {
  return input
    .replace(HTML_TAG_RE, '')
    .replace(EVENT_HANDLER_RE, '')
    .replace(DANGEROUS_URI_RE, '')
    .trim()
}

/**
 * Sanitizes a string value: trims whitespace and strips HTML tags.
 * Returns `null` if the result is empty.
 */
export function sanitizeText(input: string | null | undefined): string | null {
  if (input == null) return null
  const cleaned = stripHtml(input.trim())
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Sanitizes a string and ensures it is non-empty.
 * Throws if the result would be empty (use for required fields).
 */
export function sanitizeRequired(input: string, fieldName: string): string {
  const cleaned = stripHtml(input.trim())
  if (cleaned.length === 0) {
    throw new SanitizationError(`${fieldName} must not be empty after sanitization`)
  }
  return cleaned
}

export class SanitizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SanitizationError'
  }
}
