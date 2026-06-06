/**
 * Converts a string into a clean, URL-safe and folder-safe slug.
 * E.g., "Cri Cph 15 Automatic Pump Controller" -> "cri-cph-15-automatic-pump-controller"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}
