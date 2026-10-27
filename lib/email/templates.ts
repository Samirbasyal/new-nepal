// ========================================
// EMAIL - THE MESSAGES THEMSELVES
// ========================================
// Each function returns the two versions of one email:
//   text -> for simple mail programs
//   html -> for everybody else (the nice version)
//
// Two rules followed everywhere in this file:
//   1. The link and the code are the ONLY personal values. We never email a
//      password, and we never email a password hash.
//   2. The text version always contains the link too, so a member whose email
//      program blocks images and styling can still finish what they started.
// ========================================

import { organization } from '@/config/site';
import { emailSettings } from '@/lib/email/mailer';

export type BuiltEmail = {
  subject: string;
  text: string;
  html: string;
};

// ========================================
// SHARED LOOK
// ========================================
// Inline styles only: many email programs ignore <style> blocks.
function wrap(title: string, intro: string, innerHtml: string, footerNote: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8e6;">
        <div style="background:#0f5c46;padding:20px 24px;">
          <div style="color:#ffffff;font-size:16px;font-weight:700;">${organization.name}</div>
          <div style="color:#bfe0d5;font-size:12px;margin-top:2px;">${organization.tagline}</div>
        </div>
        <div style="padding:24px;">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f2f26;">${title}</h1>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#3d4b47;">${intro}</p>
          ${innerHtml}
          <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#6b7a76;">${footerNote}</p>
        </div>
      </div>
      <p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:#8a9a96;text-align:center;">
        This message was sent automatically. Please do not reply with your password.
      </p>
    </div>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 18px;">
    <a href="${href}" style="display:inline-block;background:#0f5c46;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>
  </p>`;
}

function codeBox(code: string): string {
  return `<div style="margin:0 0 18px;padding:16px;background:#f1f7f4;border:1px dashed #9dc9b8;border-radius:10px;text-align:center;">
    <div style="font-size:12px;color:#5c6b67;letter-spacing:0.06em;text-transform:uppercase;">Your code</div>
    <div style="font-size:30px;font-weight:700;letter-spacing:0.18em;color:#0f5c46;margin-top:6px;">${code}</div>
  </div>`;
}

function linkFallback(link: string): string {
  return `<p style="margin:0 0 8px;font-size:12px;color:#6b7a76;">If the button does not work, copy this address into your browser:</p>
  <p style="margin:0 0 18px;font-size:12px;word-break:break-all;color:#0f5c46;">${link}</p>`;
}

function signOff(): string {
  const s = emailSettings();
  // When the sender name IS the club name, printing both looks like a mistake.
  if (s.fromName.trim().toLowerCase() === organization.name.trim().toLowerCase()) {
    return organization.name;
  }
  return `${s.fromName}<br />${organization.name}`;
}

// ========================================
// 1. "PROVE THIS EMAIL ADDRESS IS YOURS"
// ========================================
export function buildVerificationEmail(input: {
  memberName: string;
  code: string;
  link: string;
  expiresMinutes: number;
}): BuiltEmail {
  const subject = `Verify your email address - ${organization.name}`;

  const text = [
    `Namaste ${input.memberName},`,
    '',
    `An account has been created for you at ${organization.name}.`,
    'To finish setting it up, please prove that this email address is yours.',
    '',
    `Option 1 - click this link:`,
    input.link,
    '',
    `Option 2 - open the website, choose "Verify email" and type this code:`,
    input.code,
    '',
    `The link and the code stop working after ${input.expiresMinutes} minutes.`,
    'If you were not expecting this message you can ignore it - the account stays locked.',
    '',
    organization.name,
  ].join('\n');

  const html = wrap(
    'Verify your email address',
    `Namaste ${input.memberName}, an account has been created for you at ${organization.name}. Please prove that this email address is yours to finish setting it up.`,
    button(input.link, 'Verify my email') +
      codeBox(input.code) +
      `<p style="margin:0 0 18px;font-size:13px;color:#3d4b47;">The button and the code both stop working after <strong>${input.expiresMinutes} minutes</strong>. If they expire, just ask for a new link on the verify page.</p>` +
      linkFallback(input.link),
    `If you were not expecting this message you can safely ignore it. The account stays locked until it is verified.<br /><br />${signOff()}`,
  );

  return { subject, text, html };
}

// ========================================
// 2. "HERE IS HOW TO CHOOSE A NEW PASSWORD"
// ========================================
export function buildPasswordResetEmail(input: {
  memberName: string;
  code: string;
  link: string;
  expiresMinutes: number;
}): BuiltEmail {
  const subject = `Reset your password - ${organization.name}`;

  const text = [
    `Namaste ${input.memberName},`,
    '',
    'Somebody asked to reset the password for your account.',
    '',
    'If it was you, use either of these:',
    `  Link: ${input.link}`,
    `  Code: ${input.code}`,
    '',
    `They stop working after ${input.expiresMinutes} minutes, and they can be used once.`,
    'If it was not you, you can ignore this message: your current password keeps working.',
    '',
    organization.name,
  ].join('\n');

  const html = wrap(
    'Choose a new password',
    `Namaste ${input.memberName}, somebody asked to reset the password for your account. If that was you, use the button below.`,
    button(input.link, 'Choose a new password') +
      codeBox(input.code) +
      `<p style="margin:0 0 18px;font-size:13px;color:#3d4b47;">Choose a password you have not used before. It must be at least 8 characters and include a letter and a number. This link and code expire after <strong>${input.expiresMinutes} minutes</strong>.</p>` +
      linkFallback(input.link),
    `If you did not ask for this, you can ignore this message - nothing has changed and your current password still works.<br /><br />${signOff()}`,
  );

  return { subject, text, html };
}

// ========================================
// 3. GENERAL NOTIFICATION (used by the fund, loan and district systems)
// ========================================
export function buildNotificationEmail(input: {
  memberName: string;
  title: string;
  message: string;
  link?: string | null;
  linkLabel?: string;
}): BuiltEmail {
  const subject = `${input.title} - ${organization.name}`;

  const text = [
    `Namaste ${input.memberName},`,
    '',
    input.message,
    input.link ? `\n${input.linkLabel ?? 'Open'}: ${input.link}` : '',
    '',
    organization.name,
  ]
    .filter(Boolean)
    .join('\n');

  const html = wrap(
    input.title,
    `Namaste ${input.memberName},`,
    `<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#3d4b47;">${input.message}</p>` +
      (input.link ? button(input.link, input.linkLabel ?? 'Open the website') : ''),
    `${signOff()}`,
  );

  return { subject, text, html };
}

// ========================================
// 4. "YOUR MEMBERSHIP REQUEST WAS APPROVED"
// ========================================
// Sent at the moment an administrator approves a registration request.
//
// WHAT THIS EMAIL CARRIES, AND WHAT IT DOES NOT
//   It carries ONE single-use link. It does NOT carry a password: the applicant
//   chooses their own, which is the only way the office can honestly say it has
//   never seen it.
//
//   If the club has no mail server set up, this email is never sent - and the
//   Admin Panel shows the same link so an administrator can pass it on by hand.
//   Nothing pretends the message arrived.
// ========================================
export function buildMembershipApprovedEmail(input: {
  applicantName: string;
  link: string;
  expiresMinutes: number;
}): BuiltEmail {
  const subject = `Your membership request was approved - ${organization.name}`;
  const days = Math.max(1, Math.round(input.expiresMinutes / (60 * 24)));

  const text = [
    `Namaste ${input.applicantName},`,
    '',
    `Good news - the committee has approved your request to join ${organization.name}.`,
    '',
     'To finish, press the green "Activate my account" button in this email and choose your own password.',
     '',
    `The link can be used once and stops working after ${days} day(s).`,
    'If it expires, ask the office for a new one - they can create another in a moment.',
    '',
    'Nobody at the club can see your password, and no password is ever sent by email.',
    '',
    organization.name,
  ].join('\n');

  const html = wrap(
    'Your membership request was approved',
    `Namaste ${input.applicantName}, the committee has approved your request to join ${organization.name}. One step is left: choose your own password.`,
    // Only the button. The long address used to be printed underneath as a
    // fallback, but that put the single-use token on screen in plain text - easy
    // to forward by accident, easy to photograph. A button is enough, and a
    // member whose mail client refuses it can ask the office for a new link.
    button(input.link, 'Activate my account') +
      `<p style="margin:0 0 18px;font-size:13px;color:#3d4b47;">The button works <strong>once</strong> and stops working after <strong>${days} day(s)</strong>. If it has expired, or the button does not open, ask the office for a new link - they can make another in a moment.</p>`,
    `No password is ever sent by email, and nobody at the club can see the password you choose.<br /><br />${signOff()}`,
  );

  return { subject, text, html };
}

// ========================================
// 5. "YOUR MEMBERSHIP REQUEST WAS NOT ACCEPTED"
// ========================================
// Optional and courteous: a person who took the time to write a letter deserves
// an answer rather than silence. The reason is whatever the administrator typed,
// and it is left out completely when they did not type one.
// ========================================
export function buildMembershipRejectedEmail(input: {
  applicantName: string;
  reason?: string | null;
}): BuiltEmail {
  const subject = `About your membership request - ${organization.name}`;

  const reasonText = input.reason ? `\nReason given by the office:\n${input.reason}\n` : '';

  const text = [
    `Namaste ${input.applicantName},`,
    '',
    `Thank you for asking to join ${organization.name}.`,
    'The committee has reviewed your request and is not able to accept it at this time.',
    reasonText,
    'You are welcome to contact the office if you would like to talk about it.',
    '',
    organization.name,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  const html = wrap(
    'About your membership request',
    `Namaste ${input.applicantName}, thank you for asking to join ${organization.name}. The committee has reviewed your request and is not able to accept it at this time.`,
    (input.reason
      ? `<div style="margin:0 0 18px;padding:14px 16px;background:#fdf3f2;border-left:3px solid #c0392b;border-radius:8px;font-size:13px;line-height:1.6;color:#3d4b47;"><strong>Reason given by the office</strong><br />${input.reason}</div>`
      : '') +
      `<p style="margin:0 0 18px;font-size:13px;color:#3d4b47;">You are welcome to contact the office if you would like to talk about it.</p>`,
    `${signOff()}`,
  );

  return { subject, text, html };
}
