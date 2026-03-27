import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Image file is required.",
        },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported file type. Please upload JPG, PNG, WEBP, or GIF.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const safeOriginalName = sanitizeFileName(file.name || "image");
    const finalFileName = `${timestamp}-${safeOriginalName}`;
    const finalPath = path.join(uploadsDir, finalFileName);

    await writeFile(finalPath, buffer);

    const publicUrl = `/uploads/products/${finalFileName}`;

    return NextResponse.json({
      ok: true,
      message: "Image uploaded successfully.",
      file_name: finalFileName,
      url: publicUrl,
    });
  } catch (error) {
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