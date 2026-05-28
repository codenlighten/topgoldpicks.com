#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const subject = process.argv[2] || 'Touch Gold Picks Alert';
const to = process.env.MONITOR_ALERT_TO || process.env.SMTP_USER;
const fromName = process.env.MAIL_FROM_NAME || 'Touch Gold Picks Monitor';
const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;

let body = '';
for await (const chunk of process.stdin) body += chunk;

if (!to) {
  console.error('[alert] no MONITOR_ALERT_TO or SMTP_USER set, cannot send');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: (process.env.SMTP_SECURE || 'true') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

try {
  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    text: body,
  });
  console.log(`[alert] sent to ${to}: ${subject}`);
} catch (err) {
  console.error(`[alert] send failed: ${err.message}`);
  process.exit(1);
}
