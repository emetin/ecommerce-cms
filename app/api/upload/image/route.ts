import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: `Image must be smaller than ${maxSizeMb}MB.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name || "upload";
    const ext = path.extname(originalName) || ".jpg";
    const baseName = path.basename(originalName, ext);
    const safeBaseName = slugifyFileName(baseName) || "image";
    const fileName = `${Date.now()}-${safeBaseName}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "collections");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/collections/${fileName}`;

    return NextResponse.json({
      ok: true,
      url: fileUrl,
      fileName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Upload failed.",
      },
      { status: 500 }
    );
  }
}