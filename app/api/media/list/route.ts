import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

const SHEET_NAME = "media";

type RawMediaItem = {
  id?: string;
  file_name?: string;
  file_id?: string;
  image_url?: string;
  preview_url?: string;
  mime_type?: string;
  size_bytes?: string;
  folder?: string;
  alt_text?: string;
  created_at?: string;
};

function normalizeMediaItem(item: RawMediaItem) {
  const fileId = item.file_id || "";
  const imageUrl = item.image_url || "";
  const previewUrl =
    item.preview_url ||
    (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w300` : "");

  return {
    id: item.id || "",
    file_name: item.file_name || "",
    file_id: fileId,
    image_url: imageUrl,
    preview_url: previewUrl,
    mime_type: item.mime_type || "",
    size_bytes: item.size_bytes || "",
    folder: item.folder || "",
    alt_text: item.alt_text || "",
    created_at: item.created_at || "",
  };
}

export async function GET() {
  try {
    const items = await getSheetData(SHEET_NAME, {
      forceFresh: true,
      ttlSeconds: 0,
    });

    const normalizedItems = Array.isArray(items)
      ? items.map((item) => normalizeMediaItem(item as RawMediaItem)).reverse()
      : [];

    return NextResponse.json({
      ok: true,
      items: normalizedItems,
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