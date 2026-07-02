import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"ULSESA" <${process.env.SMTP_FROM || "noreply@ulsesa.org"}>`,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, "<br>"),
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

export async function sendOTPEmail(
  to: string,
  otp: string,
  name: string
): Promise<boolean> {
  const html = `
    <h2>Hello ${name},</h2>
    <p>Your verification code is:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center; margin: 20px 0;">
      ${otp}
    </div>
    <p>This code expires in 10 minutes.</p>
    <p>If you didn't request this code, please ignore this email.</p>
  `;

  return sendEmail(
    to,
    "ULSESA Verification Code",
    `Your verification code is: ${otp}`,
    html
  );
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  status: "approved" | "rejected" | "pending"
): Promise<boolean> {
  const subjects = {
    approved: "ULSESA Account Verified! 🎉",
    rejected: "ULSESA Account Verification Failed",
    pending: "ULSESA Account Under Review",
  };

  const contents = {
    approved: `
      <h2>Hello ${name},</h2>
      <p>Your ULSESA account has been <strong>verified</strong>!</p>
      <p>You now have full access to:</p>
      <ul>
        <li>Vote in elections</li>
        <li>RSVP for events</li>
        <li>View your membership card</li>
        <li>Participate in department activities</li>
      </ul>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Go to Dashboard</a></p>
    `,
    rejected: `
      <h2>Hello ${name},</h2>
      <p>Unfortunately, we couldn't verify your account.</p>
      <p>This could be because:</p>
      <ul>
        <li>The document uploaded was unclear</li>
        <li>The information didn't match our records</li>
        <li>You may not be a member of ULSESA</li>
      </ul>
      <p>Please contact an executive member for assistance or try registering again with a clearer document.</p>
    `,
    pending: `
      <h2>Hello ${name},</h2>
      <p>Your account is currently under review.</p>
      <p>Our team will verify your details and get back to you within 24-48 hours.</p>
    `,
  };

  return sendEmail(to, subjects[status], "", contents[status]);
}

export async function sendVoteConfirmationEmail(
  to: string,
  name: string,
  electionTitle: string,
  receipts: Array<{ token: string; positionTitle: string }>
): Promise<boolean> {
  const receiptList = receipts
    .map(
      (r) => `
      <li><strong>${r.positionTitle}</strong> - Receipt: <code>${r.token.slice(0, 8)}...</code></li>
    `
    )
    .join("");

  const html = `
    <h2>Hello ${name},</h2>
    <p>Your vote in <strong>${electionTitle}</strong> has been recorded!</p>
    <p>Your vote receipts:</p>
    <ul>${receiptList}</ul>
    <p>Keep these receipts safe. You can verify your vote at any time using your receipt token.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/vote/verify">Verify Your Vote</a></p>
  `;

  return sendEmail(
    to,
    `Vote Confirmed: ${electionTitle}`,
    `Your vote in ${electionTitle} has been recorded.`,
    html
  );
}
