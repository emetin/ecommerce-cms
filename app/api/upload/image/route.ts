import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name || "") || ".jpg";
    const baseName = path.basename(file.name || "image", ext);
    const safeName = sanitizeFileName(baseName || "image");
    const finalName = `${Date.now()}-${safeName}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, finalName);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/uploads/products/${finalName}`,
      fileName: finalName,
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