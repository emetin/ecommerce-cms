import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";
import { deleteSheetRowById } from "../../../../lib/sheets-row-utils";
import { deleteFileFromDrive } from "../../../../lib/drive";

type ProductImageRecord = {
  id?: string;
  image_file_id?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const id = normalizeText(body?.id);
    const deleteDriveFile =
      String(body?.delete_drive_file || "false").trim().toLowerCase() === "true";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required." },
        { status: 400 }
      );
    }

    const items = (await getSheetData("product_images")) as ProductImageRecord[];
    const current =
      items.find((item) => String(item.id || "").trim() === id) || null;

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Product image not found." },
        { status: 404 }
      );
    }

    if (deleteDriveFile && current.image_file_id) {
      try {
        await deleteFileFromDrive(current.image_file_id);
      } catch (error) {
        console.error("Drive delete failed during product image delete:", error);
      }
    }

    await deleteSheetRowById("product_images", id);

    return NextResponse.json({
      ok: true,
      message: "Product image deleted successfully.",
      id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete product image.",
      },
      { status: 500 }
    );
  }
}