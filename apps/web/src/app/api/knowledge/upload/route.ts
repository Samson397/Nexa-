import {
  canExtractPlainText,
  ensureUserWorkspace,
  indexDocument,
  writeAudit,
} from "@/lib/services";
import {
  getClientIp,
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
 * POST /api/knowledge/upload — multipart upload + index when plain text is extractable.
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

    const { profileId, workspaceId: defaultWs } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );
    const formWorkspace = form.get("workspaceId");
    const workspaceId =
      typeof formWorkspace === "string" && formWorkspace.length > 0
        ? formWorkspace
        : defaultWs;

    const titleField = form.get("title");
    const title =
      typeof titleField === "string" && titleField.trim()
        ? titleField.trim()
        : file.name;

    let textContent: string | null = null;
    if (canExtractPlainText(file.name, mime)) {
      try {
        textContent = await file.text();
      } catch {
        textContent = null;
      }
    }

    const storagePath = `uploads/${workspaceId}/${newId()}/${file.name}`;
    const result = await indexDocument({
      workspaceId,
      userId: profileId,
      title,
      fileName: file.name,
      mimeType: mime,
      storagePath,
      sizeBytes: file.size,
      textContent,
    });

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: "kb.index",
      resourceType: "knowledge_document",
      resourceId: result.document.id,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        fileName: file.name,
        mimeType: mime,
        status: result.document.status,
        chunkCount: result.document.chunkCount,
      },
    });

    return jsonOk(
      {
        ok: true,
        demo: result.demo,
        job: {
          id: newId(),
          documentId: result.document.id,
          status: result.document.status,
          fileName: result.document.fileName,
          mimeType: mime,
          sizeBytes: file.size,
          chunkCount: result.document.chunkCount,
          errorMessage: result.document.errorMessage,
          createdAt: result.document.createdAt,
        },
        document: result.document,
        message:
          result.document.status === "indexed"
            ? undefined
            : "Upload accepted. Binary parsers may need optional deps — metadata stored.",
      },
      { status: result.document.status === "indexed" ? 201 : 202 },
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
