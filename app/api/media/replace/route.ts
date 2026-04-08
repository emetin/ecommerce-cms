import { NextResponse } from "next/server";
import {
  type DriveEntityType,
  replaceFileOnDrive,
} from "../../../../lib/drive";

const ALLOWED_ENTITY_TYPES: DriveEntityType[] = [
  "product",
  "collection",
  "blog",
];

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

function isValidEntityType(value: string): value is DriveEntityType {
  return ALLOWED_ENTITY_TYPES.includes(value as DriveEntityType);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const entityTypeRaw = normalizeText(formData.get("entityType"));
    const alt = normalizeText(formData.get("alt"));
    const oldFileId = normalizeText(formData.get("oldFileId"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Image file is required.",
        },
        { status: 400 }
      );
    }

    if (!entityTypeRaw || !isValidEntityType(entityTypeRaw)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid entityType. Use "product", "collection", or "blog".',
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

    const result = await replaceFileOnDrive({
      file,
      entityType: entityTypeRaw,
      alt,
      oldFileId,
    });

    return NextResponse.json({
      ok: true,
      message: "Image replaced successfully.",
      entity_type: result.entityType,
      file_id: result.fileId,
      file_name: result.fileName,
      url: result.url,
      alt: result.alt,
      uploaded_at: result.uploadedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to replace image.",
      },
      { status: 500 }
    );
  }
}