import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_CAREER_WEB_APP_URL;
const APPS_SCRIPT_SECRET = process.env.GOOGLE_APPS_SCRIPT_CAREER_SECRET;

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function clean(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

async function fileToBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return buffer.toString("base64");
}

export async function POST(request: Request) {
  try {
    if (!APPS_SCRIPT_URL) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Missing GOOGLE_APPS_SCRIPT_CAREER_WEB_APP_URL in .env.local.",
        },
        { status: 500 }
      );
    }

    if (!APPS_SCRIPT_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing GOOGLE_APPS_SCRIPT_CAREER_SECRET in .env.local.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    const position = clean(formData.get("position"));
    const fullName = clean(formData.get("fullName"));
    const email = clean(formData.get("email"));
    const phone = clean(formData.get("phone"));
    const location = clean(formData.get("location"));
    const linkedinUrl = clean(formData.get("linkedinUrl"));
    const portfolioUrl = clean(formData.get("portfolioUrl"));
    const coverNote = clean(formData.get("coverNote"));

    const resumeFile = formData.get("resumeFile");

    if (!position || !fullName || !email || !phone) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please fill in position, full name, email and phone.",
        },
        { status: 400 }
      );
    }

    if (!(resumeFile instanceof File) || resumeFile.size === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please upload your resume file.",
        },
        { status: 400 }
      );
    }

    if (resumeFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          message: `Resume file must be smaller than ${MAX_FILE_SIZE_MB} MB.`,
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_RESUME_TYPES.includes(resumeFile.type)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Only PDF, DOC and DOCX files are accepted. Current file type: ${resumeFile.type}`,
        },
        { status: 400 }
      );
    }

    const resumeBase64 = await fileToBase64(resumeFile);

    const appsScriptPayload = {
      secret: APPS_SCRIPT_SECRET,
      position,
      fullName,
      email,
      phone,
      location,
      linkedinUrl,
      portfolioUrl,
      coverNote,
      source: "global_cms_career_page",
      resumeFileName: resumeFile.name,
      resumeMimeType: resumeFile.type,
      resumeBase64,
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(appsScriptPayload),
    });

    const rawText = await response.text();

    let result: {
      ok?: boolean;
      message?: string;
      resumeUrl?: string;
    };

    try {
      result = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          message: "Apps Script returned an invalid response.",
          rawResponse: rawText,
        },
        { status: 500 }
      );
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: result.message || "Application could not be submitted.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: result.message || "Application submitted successfully.",
      resumeUrl: result.resumeUrl || "",
    });
  } catch (error) {
    console.error("Career application error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Application could not be submitted.",
      },
      { status: 500 }
    );
  }
}