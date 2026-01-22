/**
 * Path utility functions
 * Standard JavaScript implementation for cross-platform path handling
 */

/**
 * Joins path parts into a single path string
 */
export function joinPath(...parts: string[]): string {
  return parts.filter((p) => p).join("/");
}

/**
 * Extracts the filename from a path
 */
export function basename(path: string): string {
  return path.split("/").pop() || "";
}

/**
 * Extracts the directory path from a path
 */
export function dirname(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/";
}
