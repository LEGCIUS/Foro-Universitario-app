require('dotenv').config();

async function createTransporter() {
  // Lazy require so code doesn't crash if nodemailer isn't installed yet during dev
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (err) {
    console.warn('nodemailer not installed; email sending disabled');
    return null;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for others
      auth: user && pass ? { user, pass } : undefined,
    });
    return { transporter, isTest: false };
  }

  // If SMTP not configured, create an Ethereal test account automatically (for development).
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.warn('Using Ethereal test account for email (development only)');
    return { transporter, isTest: true, testAccount };
  } catch (err) {
    console.warn('SMTP_HOST/PORT not configured and Ethereal account creation failed; email disabled');
    return null;
  }
}

/**
 * Send an email. Returns an object with `{ ok: true }` on success or `{ ok:false, error }
 */
async function sendEmail({ to, subject, text, html }) {
  const created = await createTransporter();
  if (!created) return { ok: false, error: 'transporter-unavailable' };

  const { transporter, isTest, testAccount } = created;
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || `no-reply@${process.env.SMTP_HOST || 'example.com'}`;

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log('Email sent', info && info.messageId);
    const result = { ok: true, info };
    if (isTest) {
      // Nodemailer helper to get preview URL for Ethereal
      try {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) result.previewUrl = previewUrl;
      } catch (e) {
        // ignore
      }
    }
    return result;
  } catch (err) {
    console.error('sendEmail error', err && (err.message || err));
    return { ok: false, error: err && err.message };
  }
}

module.exports = { sendEmail };
