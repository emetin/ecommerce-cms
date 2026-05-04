import { Readable } from "stream";
import { google } from "googleapis";

export type DriveEntityType = "product" | "collection" | "blog";

export type DriveUploadResult = {
  fileId: string;
  fileName: string;
  url: string;
  previewUrl: string;
  alt: string;
  uploadedAt: string;
  entityType: DriveEntityType;
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

function getClientEmail() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
}

function getPrivateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "";
}

function getDriveFolderIds(): Record<DriveEntityType, string | undefined> {
  return {
    product: process.env.GOOGLE_DRIVE_PRODUCT_IMAGE_FOLDER_ID,
    collection: process.env.GOOGLE_DRIVE_COLLECTION_IMAGE_FOLDER_ID,
    blog: process.env.GOOGLE_DRIVE_BLOG_IMAGE_FOLDER_ID,
  };
}

function assertDriveEnv() {
  const clientEmail = getClientEmail();
  const privateKey = getPrivateKey();

  if (!clientEmail) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL.");
  }

  if (!privateKey) {
    throw new Error("Missing GOOGLE_PRIVATE_KEY.");
  }

  return {
    clientEmail,
    privateKey,
  };
}

function getDriveAuth() {
  const { clientEmail, privateKey } = assertDriveEnv();

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDriveClient() {
  const auth = getDriveAuth();

  return google.drive({
    version: "v3",
    auth,
  });
}

function sanitizeFileName(fileName: string) {
  const cleanName = String(fileName || "image")
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleanName || "image";
}

function sanitizeAltText(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getFolderIdByEntityType(entityType: DriveEntityType) {
  const folderId = getDriveFolderIds()[entityType];

  if (!folderId) {
    throw new Error(
      `Missing Google Drive folder env for entity type "${entityType}".`
    );
  }

  return folderId;
}

function buildPublicUrl(fileId: string) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function buildPreviewUrl(fileId: string, size = "w300") {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
}

function buildFileName(entityType: DriveEntityType, originalName: string) {
  const timestamp = Date.now();
  const safeFileName = sanitizeFileName(originalName || "image");

  return `${entityType}-${timestamp}-${safeFileName}`;
}

function assertValidImageFile(file: File) {
  if (!(file instanceof File)) {
    throw new Error("A valid file is required.");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type. Please upload JPG, PNG, WEBP, or GIF.");
  }
}

export async function uploadFileToDrive(
  file: File,
  entityType: DriveEntityType,
  alt?: string
): Promise<DriveUploadResult> {
  assertValidImageFile(file);

  const folderId = getFolderIdByEntityType(entityType);
  const drive = getDriveClient();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const stream = Readable.from(buffer);

  const finalFileName = buildFileName(entityType, file.name || "image");
  const uploadedAt = new Date().toISOString();

  const createdFile = await drive.files.create({
    requestBody: {
      name: finalFileName,
      parents: [folderId],
    },
    media: {
      mimeType: file.type || "application/octet-stream",
      body: stream,
    },
    fields: "id,name,webViewLink,webContentLink",
    supportsAllDrives: true,
  });

  const fileId = createdFile.data.id;

  if (!fileId) {
    throw new Error("Failed to upload file to Google Drive.");
  }

  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
      supportsAllDrives: true,
    });
  } catch (error) {
    console.error("Drive permission create failed:", error);
  }

  return {
    fileId,
    fileName: createdFile.data.name || finalFileName,
    url: buildPublicUrl(fileId),
    previewUrl: buildPreviewUrl(fileId),
    alt: sanitizeAltText(alt || file.name || entityType),
    uploadedAt,
    entityType,
  };
}

export async function deleteFileFromDrive(fileId: string) {
  const normalizedFileId = String(fileId || "").trim();

  if (!normalizedFileId) {
    throw new Error("fileId is required to delete a Drive file.");
  }

  const drive = getDriveClient();

  await drive.files.delete({
    fileId: normalizedFileId,
    supportsAllDrives: true,
  });

  return {
    ok: true,
    fileId: normalizedFileId,
  };
}

export async function replaceFileOnDrive(params: {
  file: File;
  entityType: DriveEntityType;
  alt?: string;
  oldFileId?: string;
}) {
  const { file, entityType, alt, oldFileId } = params;

  const uploaded = await uploadFileToDrive(file, entityType, alt);

  const normalizedOldFileId = String(oldFileId || "").trim();

  if (normalizedOldFileId && normalizedOldFileId !== uploaded.fileId) {
    try {
      await deleteFileFromDrive(normalizedOldFileId);
    } catch (error) {
      console.error(
        "Drive old file delete failed after successful replacement:",
        error
      );
    }
  }

  return uploaded;
}

export async function uploadProductImageToDrive(file: File, alt?: string) {
  return uploadFileToDrive(file, "product", alt);
}

export async function uploadCollectionImageToDrive(file: File, alt?: string) {
  return uploadFileToDrive(file, "collection", alt);
}

export async function uploadBlogImageToDrive(file: File, alt?: string) {
  return uploadFileToDrive(file, "blog", alt);
}