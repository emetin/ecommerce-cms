type SendResetMailParams = {
  to: string;
  resetUrl: string;
};

export async function sendCustomerPasswordResetEmail({
  to,
  resetUrl,
}: SendResetMailParams) {
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
      to,
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #171717;">
          <p>Hello,</p>
          <p>We received a request to reset the password for your account.</p>
          <p>
            <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">
              Click here to reset your password
            </a>
          </p>
          <p>This link will expire in 15 minutes and can only be used once.</p>
          <p>If you did not request this change, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send reset email: ${text}`);
  }
}