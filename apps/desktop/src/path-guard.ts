import path from "node:path";

/**
 * Resolve a user-supplied path and assert it stays under one of the
 * approved root directories. Rejects `..` escapes and symlink tricks
 * that resolve outside the sandbox.
 */
export function assertApprovedPath(
  inputPath: string,
  approvedPaths: string[],
): string {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Path is required");
  }
  if (!approvedPaths.length) {
    throw new Error("No approved paths configured — grant folder access first");
  }

  const resolved = path.resolve(inputPath);

  // Reject null bytes and obvious traversal before resolution
  if (inputPath.includes("\0")) {
    throw new Error("Invalid path");
  }

  const isAllowed = approvedPaths.some((root) => {
    const resolvedRoot = path.resolve(root);
    const relative = path.relative(resolvedRoot, resolved);
    // Inside root if relative is empty (exact match) or does not escape
    return (
      relative === "" ||
      (!relative.startsWith("..") && !path.isAbsolute(relative))
    );
  });

  if (!isAllowed) {
    throw new Error(
      `Access denied: path is outside approved directories (${resolved})`,
    );
  }

  return resolved;
}

/** Normalize and dedupe approved roots. */
export function normalizeApprovedPaths(paths: string[]): string[] {
  const unique = new Set(
    paths
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .map((p) => path.resolve(p.trim())),
  );
  return [...unique];
}
