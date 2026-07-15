import {
  handleRouteError,
  jsonError,
  jsonOk,
  newId,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
} from "@/lib/validators";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * POST /api/knowledge/upload — multipart file upload stub.
 * Validates allowed types (pdf, docx, xlsx, images, zip, md, code) and
 * returns a pending indexing job. Does not persist file bytes in demo mode.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "knowledge-upload",
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError(
        "VALIDATION_ERROR",
        "Expected multipart/form-data with a file field",
        { status: 400 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("VALIDATION_ERROR", "Missing file field", {
        status: 400,
      });
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return jsonError(
        "VALIDATION_ERROR",
        `File must be between 1 byte and ${MAX_BYTES} bytes`,
        { status: 400 },
      );
    }

    const ext = extensionOf(file.name);
    const mime = file.type || "application/octet-stream";
    const extAllowed = ALLOWED_UPLOAD_EXTENSIONS.includes(
      ext as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number],
    );
    const mimeAllowed =
      ALLOWED_UPLOAD_MIME_TYPES.includes(
        mime as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
      ) ||
      mime.startsWith("text/") ||
      mime.startsWith("image/");

    if (!extAllowed && !mimeAllowed) {
      return jsonError(
        "UNSUPPORTED_FILE_TYPE",
        "Unsupported file type. Allowed: pdf, docx, xlsx, images, zip, md, and common code files.",
        {
          status: 415,
          details: { extension: ext, mimeType: mime },
        },
      );
    }

    const jobId = newId();
    const documentId = newId();

    return jsonOk(
      {
        ok: true,
        demo: true,
        job: {
          id: jobId,
          documentId,
          status: "pending",
          fileName: file.name,
          mimeType: mime,
          sizeBytes: file.size,
          createdAt: new Date().toISOString(),
        },
        message:
          "Upload accepted. Indexing job is pending (stub — wire object storage + workers for production).",
      },
      { status: 202 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}
