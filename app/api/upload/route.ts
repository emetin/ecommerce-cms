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
  return String(value || "").trim();
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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const entityType = normalizeText(formData.get("entityType"));
    const alt = normalizeText(formData.get("alt"));

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

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      entityType
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

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