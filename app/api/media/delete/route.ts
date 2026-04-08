import { NextResponse } from "next/server";
import { deleteFileFromDrive } from "../../../../lib/drive";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fileId = normalizeText(body?.file_id);

    if (!fileId) {
      return NextResponse.json(
        {
          ok: false,
          error: "file_id is required.",
        },
        { status: 400 }
      );
    }

    await deleteFileFromDrive(fileId);

    return NextResponse.json({
      ok: true,
      message: "Drive file deleted successfully.",
      file_id: fileId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to delete Drive file.",
      },
      { status: 500 }
    );
  }
}