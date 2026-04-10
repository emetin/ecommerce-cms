import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSheetData } from "../../../../lib/sheets";
import { deleteSheetRowById } from "../../../../lib/sheets-row-utils";

type ProductImageRecord = {
  id?: string;
  image_file_id?: string;
  image_url?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeBool(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "true";
}

function getUploadsBaseDir() {
  return path.resolve(process.cwd(), "public", "uploads");
}

function tryDeleteFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error("Local file delete failed:", error);
  }

  return false;
}

function isSafeUploadPath(fullPath: string) {
  const uploadsBaseDir = getUploadsBaseDir();
  const resolved = path.resolve(fullPath);
  return resolved.startsWith(uploadsBaseDir);
}

function resolveLocalFilePath(params: {
  imageUrl?: string;
  imageFileId?: string;
}) {
  const imageUrl = normalizeText(params.imageUrl);
  const imageFileId = path.basename(normalizeText(params.imageFileId));
  const uploadsBaseDir = getUploadsBaseDir();

  if (imageUrl.startsWith("/uploads/")) {
    const relativePath = imageUrl.replace(/^\/+/, "");
    const fullPath = path.resolve(process.cwd(), "public", relativePath);

    if (isSafeUploadPath(fullPath)) {
      return fullPath;
    }
  }

  if (imageFileId) {
    const possibleDirs = ["product", "collection", "blog"];

    for (const dir of possibleDirs) {
      const fullPath = path.resolve(uploadsBaseDir, dir, imageFileId);

      if (isSafeUploadPath(fullPath) && fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const id = normalizeText(body?.id);
    const deleteLocalFile = normalizeBool(body?.delete_local_file);
    const deleteDriveFile = normalizeBool(body?.delete_drive_file);

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

    let deletedLocalFile = false;
    let deletedLocalFilePath = "";
    let driveDeleteSkipped = false;

    if (deleteLocalFile) {
      const localFilePath = resolveLocalFilePath({
        imageUrl: current.image_url,
        imageFileId: current.image_file_id,
      });

      if (localFilePath) {
        deletedLocalFile = tryDeleteFile(localFilePath);
        deletedLocalFilePath = localFilePath;
      }
    }

    if (deleteDriveFile) {
      driveDeleteSkipped = true;
    }

    await deleteSheetRowById("product_images", id);

    return NextResponse.json({
      ok: true,
      message: "Product image deleted successfully.",
      id,
      deleted_local_file: deletedLocalFile,
      deleted_local_file_path: deletedLocalFilePath,
      drive_delete_skipped: driveDeleteSkipped,
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