import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_FOLDERS = ["product", "collection", "blog"];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function getUploadsBaseDir() {
  return path.resolve(process.cwd(), "public", "uploads");
}

function isImageFile(fileName: string) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
}

function getMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";

  return "application/octet-stream";
}

function normalizeMediaItem(params: {
  folder: string;
  fileName: string;
  fullPath: string;
}) {
  const stat = fs.statSync(params.fullPath);
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
    alt_text: params.fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
    created_at: stat.birthtime?.toISOString?.() || stat.mtime.toISOString(),
  };
}

export async function GET() {
  try {
    const uploadsBaseDir = getUploadsBaseDir();

    if (!fs.existsSync(uploadsBaseDir)) {
      return NextResponse.json({
        ok: true,
        items: [],
      });
    }

    const items = [];

    for (const folder of ALLOWED_FOLDERS) {
      const folderPath = path.resolve(uploadsBaseDir, folder);

      if (!fs.existsSync(folderPath)) {
        continue;
      }

      const fileNames = fs
        .readdirSync(folderPath)
        .filter((fileName) => isImageFile(fileName));

      for (const fileName of fileNames) {
        const fullPath = path.resolve(folderPath, fileName);

        if (!fs.existsSync(fullPath)) {
          continue;
        }

        const stat = fs.statSync(fullPath);

        if (!stat.isFile()) {
          continue;
        }

        items.push(
          normalizeMediaItem({
            folder,
            fileName,
            fullPath,
          })
        );
      }
    }

    items.sort((a, b) =>
      normalizeText(b.created_at).localeCompare(normalizeText(a.created_at))
    );

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load media.",
      },
      { status: 500 }
    );
  }
}