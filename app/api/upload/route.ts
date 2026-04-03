import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file received." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    const maxSizeMb = 4;
    if (file.size > maxSizeMb * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: `Image must be smaller than ${maxSizeMb}MB.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const originalName = file.name || "image";
    const ext = path.extname(originalName) || ".jpg";
    const baseName = path.basename(originalName, ext);
    const safeBaseName = slugifyFileName(baseName) || "image";
    const fileName = `${Date.now()}-${safeBaseName}${ext}`;

    const relativeDir = path.join("uploads", "collections");
    const uploadDir = path.join(process.cwd(), "public", relativeDir);

    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;

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
          error instanceof Error ? error.message : "Image upload failed.",
      },
      { status: 500 }
    );
  }
}