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

function resolveLocalMediaPath(params: {
  id?: string;
  fileId?: string;
  imageUrl?: string;
}) {
  const uploadsBaseDir = getUploadsBaseDir();

  const id = normalizeText(params.id);
  const fileId = normalizeText(params.fileId);
  const imageUrl = normalizeText(params.imageUrl);

  const candidates = [id, fileId]
    .map((value) => value.replace(/^\/+/, ""))
    .filter(Boolean);

  if (imageUrl.startsWith("/uploads/")) {
    candidates.push(imageUrl.replace(/^\/?uploads\/?/, ""));
  }

  for (const candidate of candidates) {
    const cleanCandidate = candidate.replace(/^uploads\//, "");
    const fullPath = path.resolve(uploadsBaseDir, cleanCandidate);

    if (isSafeUploadPath(fullPath) && fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const id = normalizeText(body?.id);
    const fileId = normalizeText(body?.file_id);
    const imageUrl = normalizeText(body?.image_url);

    if (!id && !fileId && !imageUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Media ID, file ID, or image URL is required.",
        },
        { status: 400 }
      );
    }

    const localPath = resolveLocalMediaPath({
      id,
      fileId,
      imageUrl,
    });

    if (!localPath) {
      return NextResponse.json(
        {
          ok: false,
          error: "Media file was not found.",
        },
        { status: 404 }
      );
    }

    fs.unlinkSync(localPath);

    return NextResponse.json({
      ok: true,
      message: "Media deleted successfully.",
      deleted_file_path: localPath,
    });
  } catch (error) {
    console.error("MEDIA_DELETE_ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to delete media.",
      },
      { status: 500 }
    );
  }
}