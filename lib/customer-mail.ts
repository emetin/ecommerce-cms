type SendResetMailParams = {
  to: string;
  resetUrl: string;
};

type SendPortalApprovalMailParams = {
  to: string;
  contactName: string;
  companyName: string;
  resetUrl: string;
};

async function sendMail(payload: {
  to: string;
  subject: string;
  html: string;
}) {
  const mailApiUrl = process.env.MAIL_API_URL?.trim();
  const mailApiKey = process.env.MAIL_API_KEY?.trim();
  const mailFrom = process.env.MAIL_FROM?.trim();

  if (!mailApiUrl || !mailApiKey || !mailFrom) {
    throw new Error("MAIL_API_URL, MAIL_API_KEY, or MAIL_FROM is missing.");
  }

  const response = await fetch(mailApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mailApiKey}`,
    },
    body: JSON.stringify({
      from: mailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send email: ${text}`);
  }
}

export async function sendCustomerPasswordResetEmail({
  to,
  resetUrl,
}: SendResetMailParams) {
  await sendMail({
    to,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #171717;">
        <p>Hello,</p>
        <p>We received a request to reset the password for your account.</p>
        <p>
          <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">
            Reset your password
          </a>
        </p>
        <p>This link will expire in 15 minutes and can only be used once.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendCustomerPortalApprovalEmail({
  to,
  contactName,
  companyName,
  resetUrl,
}: SendPortalApprovalMailParams) {
  const safeName = String(contactName || "Partner").trim() || "Partner";
  const safeCompany = String(companyName || "").trim();

  await sendMail({
    to,
    subject: "Your Globaltex portal account is ready",
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #171717;">
        <p>Dear ${safeName},</p>

        <p>
          We are pleased to inform you that ${
            safeCompany ? `<strong>${safeCompany}</strong>` : "your company"
          } has been successfully approved as a B2B partner of Globaltex Fine Linens.
        </p>

        <p>
          To activate your customer portal access, please create your password using the secure link below:
        </p>

        <p>
          <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">
            Set your portal password
          </a>
        </p>

        <p>This link will expire in 15 minutes and can only be used once.</p>

        <p>After setting your password, you will be able to:</p>

        <ul style="padding-left: 18px; margin: 0 0 16px;">
          <li>access your assigned wholesale pricing structure</li>
          <li>review our hospitality collections</li>
          <li>create and submit order requests</li>
          <li>manage your account workflow more efficiently</li>
        </ul>

        <p>
          If you require support for hospitality sourcing, custom developments, embroidery, or bulk project requirements, our team will be pleased to assist you.
        </p>

        <p style="margin-top: 20px;">
          Warm regards,<br />
          Globaltex Fine Linens<br />
          customerservice@globaltexusa.com
        </p>
      </div>
    `,
  });
}