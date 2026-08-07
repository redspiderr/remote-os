import { createTransport, Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "[EMAIL] SMTP credentials not fully configured. Emails will be logged to console only."
    );
  }

  transporter = createTransport({
    host: host ?? "smtp.gmail.com",
    port: port ?? 587,
    secure: port === 465,
    auth: {
      user: user ?? "",
      pass: pass ?? "",
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });

  return transporter;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const from = options.from ?? process.env.SMTP_FROM ?? "REMOTE OS <noreply@remote-os.dev>";
  const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;

  // If SMTP is not configured, log to console (dev fallback)
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("\n========== EMAIL (console fallback) ==========");
    console.log(`From:    ${from}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Text:\n${options.text}`);
    console.log("=============================================\n");
    return;
  }

  const t = getTransporter();
  const info = await t.sendMail({
    from,
    to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  console.log(`[EMAIL] Sent to ${to}: ${info.messageId ?? "unknown"}`);
}
