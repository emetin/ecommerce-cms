import { NextResponse } from "next/server";
import { appendSheetRow, getSheetData } from "../../../../lib/sheets";

const SHEET_NAME = "media";

const APPS_SCRIPT_MEDIA_URL = process.env.GOOGLE_APPS_SCRIPT_MEDIA_URL;
const APPS_SCRIPT_MEDIA_SECRET = process.env.GOOGLE_APPS_SCRIPT_MEDIA_SECRET;

async function fileToBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return buffer.toString("base64");
}

async function generateUniqueFileName(originalName: string) {
  const existingFiles = await getSheetData(SHEET_NAME, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  const dotIndex = originalName.lastIndexOf(".");
  const baseName =
    dotIndex >= 0 ? originalName.slice(0, dotIndex) : originalName;
  const extension = dotIndex >= 0 ? originalName.slice(dotIndex) : "";

  const existingNames = new Set(
    Array.isArray(existingFiles)
      ? existingFiles.map((item: any) =>
          String(item.file_name || "").toLowerCase()
        )
      : []
  );

  let finalName = originalName || `image-${Date.now()}`;
  let counter = 1;

  while (existingNames.has(finalName.toLowerCase())) {
    finalName = `${baseName}(${counter})${extension}`;
    counter++;
  }

  return finalName;
}

export async function POST(req: Request) {
  try {
    if (!APPS_SCRIPT_MEDIA_URL) {
      throw new Error("Missing GOOGLE_APPS_SCRIPT_MEDIA_URL.");
    }

    if (!APPS_SCRIPT_MEDIA_SECRET) {
      throw new Error("Missing GOOGLE_APPS_SCRIPT_MEDIA_SECRET.");
    }

    const formData = await req.formData();

    const file = formData.get("file");
    const folder = String(formData.get("folder") || "general").trim();
    const altText = String(formData.get("alt_text") || "").trim();

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

    const uniqueFileName = await generateUniqueFileName(file.name);
    const fileBase64 = await fileToBase64(file);

    const scriptResponse = await fetch(APPS_SCRIPT_MEDIA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "upload",
        secret: APPS_SCRIPT_MEDIA_SECRET,
        fileBase64,
        fileName: uniqueFileName,
        mimeType: file.type,
        folder,
      }),
    });

    const scriptData = await scriptResponse.json();

    if (!scriptResponse.ok || !scriptData.ok) {
      throw new Error(
        scriptData.message ||
          scriptData.error ||
          "Apps Script upload failed."
      );
    }

    const now = new Date().toISOString();
    const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const fileId = String(scriptData.fileId || "");
    const imageUrl = String(scriptData.url || "");
    const previewUrl = fileId
      ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`
      : imageUrl;

    const item = {
      id,
      file_name: uniqueFileName,
      file_id: fileId,
      image_url: imageUrl,
      preview_url: previewUrl,
      mime_type: file.type,
      size_bytes: String(file.size || 0),
      folder: folder || "general",
      alt_text: altText,
      created_at: now,
    };

    await appendSheetRow(SHEET_NAME, [
      item.id,
      item.file_name,
      item.file_id,
      item.image_url,
      item.preview_url,
      item.mime_type,
      item.size_bytes,
      item.folder,
      item.alt_text,
      item.created_at,
    ]);

    return NextResponse.json({
      ok: true,
      message: "Media uploaded successfully.",
      item,
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