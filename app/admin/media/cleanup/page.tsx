import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getSheetData } from "../../../../lib/sheets";
import { deleteFileFromDrive } from "../../../../lib/drive";

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const IMPERSONATE_USER = process.env.GOOGLE_IMPERSONATE_USER;

const MANAGED_FOLDERS = [
  {
    entityType: "product",
    folderId: process.env.GOOGLE_DRIVE_PRODUCT_IMAGE_FOLDER_ID,
  },
  {
    entityType: "collection",
    folderId: process.env.GOOGLE_DRIVE_COLLECTION_IMAGE_FOLDER_ID,
  },
  {
    entityType: "blog",
    folderId: process.env.GOOGLE_DRIVE_BLOG_IMAGE_FOLDER_ID,
  },
];

if (!CLIENT_EMAIL) {
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL.");
}

if (!PRIVATE_KEY) {
  throw new Error("Missing GOOGLE_PRIVATE_KEY.");
}

if (!IMPERSONATE_USER) {
  throw new Error("Missing GOOGLE_IMPERSONATE_USER.");
}

function getDriveClient() {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/drive"],
    subject: IMPERSONATE_USER,
  });

  return google.drive({
    version: "v3",
    auth,
  });
}

async function listFilesInFolder(folderId: string) {
  const drive = getDriveClient();

  const files: Array<{
    id: string;
    name: string;
    createdTime?: string;
    webViewLink?: string;
  }> = [];

  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, createdTime, webViewLink)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const batch = response.data.files || [];

    for (const file of batch) {
      if (file.id && file.name) {
        files.push({
          id: file.id,
          name: file.name,
          createdTime: file.createdTime || undefined,
          webViewLink: file.webViewLink || undefined,
        });
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
}

function normalizeFileId(value: unknown) {
  return String(value || "").trim();
}

function addFileIdToSet(set: Set<string>, value: unknown) {
  const fileId = normalizeFileId(value);

  if (fileId) {
    set.add(fileId);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const deleteOrphans =
      String(body?.delete_orphans || "false").trim().toLowerCase() === "true";

    const products = (await getSheetData("products", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as Array<Record<string, string>>;

    const collections = (await getSheetData("collections", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as Array<Record<string, string>>;

    const blog = (await getSheetData("blog", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as Array<Record<string, string>>;

    const productImages = (await getSheetData("product_images", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as Array<Record<string, string>>;

    const media = (await getSheetData("media", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as Array<Record<string, string>>;

    const referencedFileIds = new Set<string>();

    for (const item of products) {
      addFileIdToSet(referencedFileIds, item.image_file_id);
      addFileIdToSet(referencedFileIds, item.file_id);
    }

    for (const item of collections) {
      addFileIdToSet(referencedFileIds, item.image_file_id);
      addFileIdToSet(referencedFileIds, item.file_id);
    }

    for (const item of blog) {
      addFileIdToSet(referencedFileIds, item.image_file_id);
      addFileIdToSet(referencedFileIds, item.file_id);
    }

    for (const item of productImages) {
      addFileIdToSet(referencedFileIds, item.image_file_id);
      addFileIdToSet(referencedFileIds, item.file_id);
    }

    for (const item of media) {
      addFileIdToSet(referencedFileIds, item.file_id);
      addFileIdToSet(referencedFileIds, item.image_file_id);
    }

    const scannedFiles: Array<{
      entity_type: string;
      folder_id: string;
      file_id: string;
      file_name: string;
      created_time?: string;
      web_view_link?: string;
    }> = [];

    for (const folder of MANAGED_FOLDERS) {
      if (!folder.folderId) continue;

      const files = await listFilesInFolder(folder.folderId);

      for (const file of files) {
        scannedFiles.push({
          entity_type: folder.entityType,
          folder_id: folder.folderId,
          file_id: file.id,
          file_name: file.name,
          created_time: file.createdTime,
          web_view_link: file.webViewLink,
        });
      }
    }

    const orphanFiles = scannedFiles.filter(
      (file) => !referencedFileIds.has(file.file_id)
    );

    const deletedFiles: string[] = [];

    if (deleteOrphans) {
      for (const orphan of orphanFiles) {
        try {
          await deleteFileFromDrive(orphan.file_id);
          deletedFiles.push(orphan.file_id);
        } catch (error) {
          console.error("Failed to delete orphan file:", orphan.file_id, error);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      delete_orphans: deleteOrphans,
      referenced_file_count: referencedFileIds.size,
      scanned_file_count: scannedFiles.length,
      orphan_file_count: orphanFiles.length,
      deleted_file_count: deletedFiles.length,
      orphan_files: orphanFiles,
      deleted_file_ids: deletedFiles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to cleanup orphan media.",
      },
      { status: 500 }
    );
  }
}