// ========================================
// DONOR EMAILS - PROVING AN ADDRESS, RESETTING A PASSWORD
// ========================================
// Two messages, both short, both carrying a single secret:
//
//   1. a six-digit code that proves the donor can read that inbox
//   2. a link that lets a donor choose a new password
//
// WHAT IS NEVER IN AN EMAIL
//   A password. Not the old one, not a temporary one. The donor chooses it on the
//   website, and only its hash is ever stored.
//
// WHAT HAPPENS WHEN NO MAIL SERVER IS CONFIGURED
//   sendMail() reports failure rather than pretending. Each function here returns
//   true/false, so the API route can tell the donor the truth: "we could not send
//   the email" is far better than "check your inbox" when nothing was sent.
// ========================================

import { organization } from '@/config/site';
import { sendMail } from '@/lib/email/mailer';
import { siteUrl } from '@/lib/auth/verification';

function wrap(title: string, bodyHtml: string): string {
  return `
  <div style="background:#f4f6f5;padding:24px 12px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8e5;">
      <div style="background:#14532d;padding:18px 22px;">
        <div style="color:#ffffff;font-size:16px;font-weight:700;">${organization.name}</div>
        <div style="color:#bfe0d5;font-size:12px;margin-top:2px;">${organization.tagline}</div>
      </div>

      <div style="padding:22px;">
        <h1 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${title}</h1>
        ${bodyHtml}
      </div>

      <div style="padding:14px 22px;border-top:1px solid #e2e8e5;color:#64748b;font-size:11px;">
        This message was sent by ${organization.name}. If you did not ask for it, you can ignore it.
      </div>
    </div>
  </div>`;
}

// ========================================
// THE VERIFICATION CODE
// ========================================
export async function sendDonorVerificationEmail(input: {
  to: string;
  name: string;
  code: string;
  minutes: number;
}): Promise<boolean> {
  const firstName = input.name.split(' ')[0] || 'there';

  const html = wrap(
    'Confirm your email address',
    `
      <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.6;">
        Hello ${firstName}, thank you for creating a donor account.
      </p>

      <p style="margin:0 0 10px;color:#334155;font-size:14px;line-height:1.6;">
        Type this code on the website to finish:
      </p>

      <div style="margin:0 0 16px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;text-align:center;">
        <span style="font-size:30px;letter-spacing:8px;font-weight:700;color:#14532d;">${input.code}</span>
      </div>

      <p style="margin:0 0 14px;color:#64748b;font-size:12px;line-height:1.6;">
        The code works once and expires in ${input.minutes} minutes.
      </p>

      <p style="margin:0;color:#334155;font-size:13px;line-height:1.6;">
        Or open <a href="${siteUrl()}/donor/verify-email" style="color:#166534;">${siteUrl()}/donor/verify-email</a>
        and enter it there.
      </p>
    `,
  );

  const result = await sendMail({
    to: input.to,
    subject: `${input.code} is your confirmation code - ${organization.name}`,
    html,
    text:
      `Hello ${firstName},\n\n` +
      `Your confirmation code is ${input.code}.\n` +
      `It works once and expires in ${input.minutes} minutes.\n\n` +
      `Enter it at ${siteUrl()}/donor/verify-email\n\n` +
      `${organization.name}`,
  });

  return result.ok === true;
}

// ========================================
// THE PASSWORD RESET LINK
// ========================================
export async function sendDonorResetEmail(input: {
  to: string;
  name: string;
  token: string;
  minutes: number;
}): Promise<boolean> {
  const firstName = input.name.split(' ')[0] || 'there';
  const link = `${siteUrl()}/donor/reset-password?token=${encodeURIComponent(input.token)}`;

  const html = wrap(
    'Choose a new password',
    `
      <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.6;">
        Hello ${firstName}, we received a request to reset the password on your donor account.
      </p>

      <p style="margin:0 0 16px;">
        <a href="${link}" style="display:inline-block;background:#166534;color:#ffffff;text-decoration:none;
           padding:11px 18px;border-radius:9px;font-size:14px;font-weight:600;">Choose a new password</a>
      </p>

      <p style="margin:0 0 14px;color:#64748b;font-size:12px;line-height:1.6;">
        The link works once and expires in ${input.minutes} minutes. If the button does not work, paste
        this address into your browser:<br />
        <span style="color:#334155;word-break:break-all;">${link}</span>
      </p>

      <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
        If you did not ask for this, nothing has changed - your current password still works.
      </p>
    `,
  );

  const result = await sendMail({
    to: input.to,
    subject: `Choose a new password - ${organization.name}`,
    html,
    text:
      `Hello ${firstName},\n\n` +
      `Choose a new password here (works once, expires in ${input.minutes} minutes):\n${link}\n\n` +
      `If you did not ask for this, nothing has changed.\n\n` +
      `${organization.name}`,
  });

  return result.ok === true;
}
