import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_ENTITY_TYPES = ["product", "collection", "blog"] as const;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeBool(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "true";
}

function sanitizeFileName(fileName: string) {
  return String(fileName || "image")
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getUploadsBaseDir() {
  return path.resolve(process.cwd(), "public", "uploads");
}

function isSafeUploadPath(fullPath: string) {
  return path.resolve(fullPath).startsWith(getUploadsBaseDir());
}

function tryDeleteFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error("Local old file delete failed:", error);
  }

  return false;
}

function resolveOldLocalFilePath(params: {
  oldImageUrl?: string;
  oldImageFileId?: string;
  entityType?: string;
}) {
  const oldImageUrl = normalizeText(params.oldImageUrl);
  const oldImageFileId = path.basename(normalizeText(params.oldImageFileId));
  const entityType = normalizeText(params.entityType);
  const uploadsBaseDir = getUploadsBaseDir();

  if (oldImageUrl.startsWith("/uploads/")) {
    const relativePath = oldImageUrl.replace(/^\/+/, "");
    const fullPath = path.resolve(process.cwd(), "public", relativePath);

    if (isSafeUploadPath(fullPath)) {
      return fullPath;
    }
  }

  if (oldImageFileId) {
    const dirs = entityType ? [entityType] : ["product", "collection", "blog"];

    for (const dir of dirs) {
      const fullPath = path.resolve(uploadsBaseDir, dir, oldImageFileId);

      if (isSafeUploadPath(fullPath) && fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const entityType = normalizeText(formData.get("entityType"));
    const alt = normalizeText(formData.get("alt"));

    const deleteOldFile = normalizeBool(formData.get("deleteOldFile"));
    const oldImageUrl = normalizeText(formData.get("oldImageUrl"));
    const oldImageFileId = normalizeText(formData.get("oldImageFileId"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Image file is required.",
        },
        { status: 400 }
      );
    }

    if (!entityType || !ALLOWED_ENTITY_TYPES.includes(entityType as any)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'entityType is required. Use "product", "collection", or "blog".',
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported file type. Please upload JPG, PNG, WEBP, or GIF.",
        },
        { status: 400 }
      );
    }

    const maxSizeMb = 8;
    if (file.size > maxSizeMb * 1024 * 1024) {
      return NextResponse.json(
        {
          ok: false,
          error: `Image must be smaller than ${maxSizeMb}MB.`,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadedAt = new Date().toISOString();
    const safeOriginalName = sanitizeFileName(file.name || "image");
    const fileName = `${entityType}-${Date.now()}-${safeOriginalName}`;

    const uploadDir = path.resolve(
      process.cwd(),
      "public",
      "uploads",
      entityType
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.resolve(uploadDir, fileName);

    if (!isSafeUploadPath(filePath)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid upload path.",
        },
        { status: 400 }
      );
    }

    fs.writeFileSync(filePath, buffer);

    let deletedOldFile = false;
    let deletedOldFilePath = "";

    if (deleteOldFile) {
      const oldLocalPath = resolveOldLocalFilePath({
        oldImageUrl,
        oldImageFileId,
        entityType,
      });

      if (oldLocalPath) {
        deletedOldFile = tryDeleteFile(oldLocalPath);
        deletedOldFilePath = oldLocalPath;
      }
    }

    const url = `/uploads/${entityType}/${fileName}`;

    return NextResponse.json({
      ok: true,
      message: "Image uploaded successfully.",
      entity_type: entityType,
      file_id: fileName,
      file_name: fileName,
      url,
      alt: alt || file.name || entityType,
      uploaded_at: uploadedAt,
      deleted_old_file: deletedOldFile,
      deleted_old_file_path: deletedOldFilePath,
    });
  } catch (error) {
    console.error("Local upload failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to upload image.",
      },
      { status: 500 }
    );
  }
}