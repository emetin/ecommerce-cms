import { google } from "googleapis";

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const PRODUCT_IMAGE_FOLDER_ID = process.env.GOOGLE_DRIVE_PRODUCT_IMAGE_FOLDER_ID;

if (!CLIENT_EMAIL) {
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL.");
}

if (!PRIVATE_KEY) {
  throw new Error("Missing GOOGLE_PRIVATE_KEY.");
}

if (!PRODUCT_IMAGE_FOLDER_ID) {
  throw new Error("Missing GOOGLE_DRIVE_PRODUCT_IMAGE_FOLDER_ID.");
}

function getDriveAuth() {
  return new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: [
      "https://www.googleapis.com/auth/drive",
    ],
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
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

export async function uploadProductImageToDrive(file: File) {
  const drive = getDriveClient();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const timestamp = Date.now();
  const safeFileName = sanitizeFileName(file.name || "image");
  const finalFileName = `${timestamp}-${safeFileName}`;

  const createdFile = await drive.files.create({
    requestBody: {
      name: finalFileName,
      parents: [PRODUCT_IMAGE_FOLDER_ID!],
    },
    media: {
      mimeType: file.type,
      body: buffer as any,
    },
    fields: "id,name,webViewLink,webContentLink",
  });

  const fileId = createdFile.data.id;

  if (!fileId) {
    throw new Error("Failed to upload file to Google Drive.");
  }

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

  return {
    fileId,
    fileName: finalFileName,
    url: publicUrl,
  };
}