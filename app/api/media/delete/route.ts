import { NextResponse } from "next/server";
import { deleteSheetRowsByField } from "../../../../lib/sheets";

const SHEET_NAME = "media";

const APPS_SCRIPT_MEDIA_URL = process.env.GOOGLE_APPS_SCRIPT_MEDIA_URL;
const APPS_SCRIPT_MEDIA_SECRET = process.env.GOOGLE_APPS_SCRIPT_MEDIA_SECRET;

export async function POST(req: Request) {
  try {
    if (!APPS_SCRIPT_MEDIA_URL) {
      throw new Error("Missing GOOGLE_APPS_SCRIPT_MEDIA_URL.");
    }

    if (!APPS_SCRIPT_MEDIA_SECRET) {
      throw new Error("Missing GOOGLE_APPS_SCRIPT_MEDIA_SECRET.");
    }

    const body = await req.json();

    const id = String(body?.id || "").trim();
    const fileId = String(body?.file_id || "").trim();

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Media ID is required.",
        },
        { status: 400 }
      );
    }

    if (!fileId) {
      return NextResponse.json(
        {
          ok: false,
          error: "File ID is required.",
        },
        { status: 400 }
      );
    }

    const scriptResponse = await fetch(APPS_SCRIPT_MEDIA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "delete",
        secret: APPS_SCRIPT_MEDIA_SECRET,
        fileId,
      }),
    });

    const scriptData = await scriptResponse.json();

    if (!scriptResponse.ok || !scriptData.ok) {
      throw new Error(
        scriptData.message ||
          scriptData.error ||
          "Apps Script delete failed."
      );
    }

    await deleteSheetRowsByField(SHEET_NAME, "id", id);

    return NextResponse.json({
      ok: true,
      message: "Media deleted successfully.",
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