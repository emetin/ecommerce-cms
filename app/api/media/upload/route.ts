import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_FOLDERS = ["product", "collection", "blog"] as const;

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

function getMimeType(fileName: string, fallback = "") {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";

  return fallback || "application/octet-stream";
}

function normalizeMediaItem(params: {
  folder: string;
  fileName: string;
  filePath: string;
  altText: string;
  uploadedAt: string;
}) {
  const stat = fs.statSync(params.filePath);
  const url = `/uploads/${params.folder}/${params.fileName}`;
  const id = `${params.folder}/${params.fileName}`;

  return {
    id,
    file_name: params.fileName,
    file_id: id,
    image_url: url,
    preview_url: url,
    mime_type: getMimeType(params.fileName),
    size_bytes: String(stat.size),
    folder: params.folder,
    alt_text:
      params.altText ||
      params.fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
    created_at: params.uploadedAt,
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const folder = normalizeText(formData.get("folder") || "product");
    const altText = normalizeText(formData.get("alt_text"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Image file is required.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_FOLDERS.includes(folder as any)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Folder is required. Use "product", "collection", or "blog".',
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
    const fileName = `${folder}-${Date.now()}-${safeOriginalName}`;

    const uploadDir = path.resolve(getUploadsBaseDir(), folder);

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

    const item = normalizeMediaItem({
      folder,
      fileName,
      filePath,
      altText,
      uploadedAt,
    });

    return NextResponse.json({
      ok: true,
      message: "Image uploaded successfully.",
      item,
      items: [item],
    });
  } catch (error) {
    console.error("MEDIA_UPLOAD_ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to upload media.",
      },
      { status: 500 }
    );
  }
}