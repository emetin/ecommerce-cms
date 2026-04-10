import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function getUploadsBaseDir() {
  return path.resolve(process.cwd(), "public", "uploads");
}

function isSafeUploadPath(fullPath: string) {
  return path.resolve(fullPath).startsWith(getUploadsBaseDir());
}

function resolveLocalFilePath(params: {
  imageUrl?: string;
  imageFileId?: string;
}) {
  const imageUrl = normalizeText(params.imageUrl);
  const imageFileId = path.basename(normalizeText(params.imageFileId));
  const uploadsBaseDir = getUploadsBaseDir();

  if (imageUrl.startsWith("/uploads/")) {
    const relativePath = imageUrl.replace(/^\/+/, "");
    const fullPath = path.resolve(process.cwd(), "public", relativePath);

    if (isSafeUploadPath(fullPath)) {
      return fullPath;
    }
  }

  if (imageFileId) {
    const possibleDirs = ["product", "collection", "blog"];

    for (const dir of possibleDirs) {
      const fullPath = path.resolve(uploadsBaseDir, dir, imageFileId);

      if (isSafeUploadPath(fullPath) && fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const imageUrl = normalizeText(body?.image_url);
    const imageFileId = normalizeText(body?.image_file_id);

    if (!imageUrl && !imageFileId) {
      return NextResponse.json(
        { ok: false, error: "image_url or image_file_id is required." },
        { status: 400 }
      );
    }

    const localFilePath = resolveLocalFilePath({
      imageUrl,
      imageFileId,
    });

    if (!localFilePath) {
      return NextResponse.json({
        ok: true,
        deleted: false,
        message: "Local file not found.",
      });
    }

    fs.unlinkSync(localFilePath);

    return NextResponse.json({
      ok: true,
      deleted: true,
      deleted_file_path: localFilePath,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete local upload file.",
      },
      { status: 500 }
    );
  }
}