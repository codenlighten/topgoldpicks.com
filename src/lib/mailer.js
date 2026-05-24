import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '465', 10);
const secure = (process.env.SMTP_SECURE || 'true') === 'true';
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;

const fromName = process.env.MAIL_FROM_NAME || 'Top Gold Picks';
const fromAddress = process.env.MAIL_FROM_ADDRESS || user;
const replyTo = process.env.MAIL_REPLY_TO || fromAddress;

let transporter;

export function getTransporter() {
  if (transporter) return transporter;
  if (!host || !user || !pass) {
    console.warn('[mailer] SMTP not fully configured, emails will be skipped');
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendWelcomeEmail({ to, plan }) {
  const tx = getTransporter();
  if (!tx) return { skipped: true, reason: 'no_transport' };

  const planLabel = ({
    free: 'Free Preview',
    gold: 'Gold Daily (7-day free trial)',
    pro: 'Pro Edge',
  })[plan] || 'Top Gold Picks';

  const subject = 'Welcome to Top Gold Picks';
  const text = `Welcome to Top Gold Picks.

You're on the list for ${planLabel}. We'll let you know the moment the daily board is open for sign-ups, and what to expect from the platform.

What Top Gold Picks is:
- AI sports angles built from live US sportsbook odds
- A focused daily board, not a full slate
- Reasoning, confidence, and risk on every pick
- Informational insights only — not betting advice

Must be 21+ where required. Problem gambling? Call 1-800-GAMBLER.

— The Top Gold Picks Team
https://topgoldpicks.com`;

  const html = `<!doctype html>
<html><body style="font-family: -apple-system, Segoe UI, Inter, sans-serif; background: #0b0a08; color: #f8f5e9; padding: 32px;">
  <div style="max-width: 560px; margin: 0 auto; background: rgba(255,255,255,0.04); border: 1px solid rgba(247,201,72,0.22); border-radius: 18px; padding: 28px;">
    <h1 style="color: #f7c948; margin: 0 0 16px; font-size: 22px;">Welcome to Top Gold Picks</h1>
    <p style="line-height: 1.6; color: #d9d3c1;">You're on the list for <strong style="color: #ffe78a;">${planLabel}</strong>. We'll email you the moment the daily board is open for sign-ups, and what to expect from the platform.</p>
    <h3 style="color: #ffe78a; margin: 24px 0 8px; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;">What Top Gold Picks is</h3>
    <ul style="line-height: 1.7; color: #d9d3c1; padding-left: 18px;">
      <li>AI sports angles built from live US sportsbook odds</li>
      <li>A focused daily board, not a full slate</li>
      <li>Reasoning, confidence, and risk on every pick</li>
      <li>Informational insights only &mdash; not betting advice</li>
    </ul>
    <p style="margin-top: 24px; font-size: 12px; color: #8b836f; line-height: 1.5;">
      Must be 21+ where required. Problem gambling? Call <a href="tel:1-800-426-2537" style="color: #ffe78a;">1-800-GAMBLER</a>. Top Gold Picks is not affiliated with, endorsed by, or sponsored by any sportsbook.
    </p>
  </div>
  <p style="text-align: center; font-size: 11px; color: #6b6452; margin-top: 16px;">&copy; 2026 Top Gold Picks &middot; <a href="https://topgoldpicks.com" style="color: #b9b19c;">topgoldpicks.com</a></p>
</body></html>`;

  return tx.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    replyTo,
    to,
    subject,
    text,
    html,
  });
}
