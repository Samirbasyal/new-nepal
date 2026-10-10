// ========================================
// EMAIL - SENDING REAL MESSAGES (SMTP)
// ========================================
// This is the ONE place in the project that talks to an email server.
// Everything else (verification mails, password reset mails, notifications)
// calls sendMail() from here.
//
// WHERE THE SETTINGS COME FROM
//   Your .env file. Nothing is hard-coded, so no password is ever in the code:
//     SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD
//     MAIL_FROM, MAIL_FROM_NAME, MAIL_REPLY_TO
//
// WHAT HAPPENS WHEN EMAIL IS NOT SET UP YET
//   The website keeps working, but nothing is pretended. sendMail() returns
//   ok:false with a clear reason, and the message (including the verification
//   link) is printed in the server terminal so you can still finish the flow
//   while developing. The website then tells the administrator, in plain words,
//   that no email was sent.
//
//   We NEVER show a fake "code" in the browser - a code the member sees on
//   screen proves nothing, because an attacker could read it too.
// ========================================

// nodemailer is loaded on demand (see loadNodemailer) so that a project without
// the package installed still starts up and can still show the website.
type NodemailerModule = {
  createTransport: (options: Record<string, unknown>) => {
    sendMail: (message: Record<string, unknown>) => Promise<{ messageId?: string }>;
    verify: () => Promise<true>;
  };
};

export type MailResult = {
  /** true only when the mail server really accepted the message. */
  ok: boolean;
  /** true when no mail server is configured, so nothing was attempted. */
  skipped?: boolean;
  /** A short, safe explanation when ok is false. */
  error?: string;
};

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

// ========================================
// READ THE SETTINGS
// ========================================
export function emailSettings() {
  const port = Number(process.env.SMTP_PORT ?? '587');

  return {
    host: (process.env.SMTP_HOST ?? '').trim(),
    port: Number.isFinite(port) ? port : 587,
    // Port 465 uses TLS from the first byte; 587 uses STARTTLS.
    secure: (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465,
    user: (process.env.SMTP_USER ?? '').trim(),
    password: (process.env.SMTP_PASSWORD ?? '').trim(),
    from: (process.env.MAIL_FROM ?? '').trim() || (process.env.SMTP_USER ?? '').trim(),
    fromName: (process.env.MAIL_FROM_NAME ?? '').trim() || 'Janakalyan Samataa Yuwa Club',
    replyTo: (process.env.MAIL_REPLY_TO ?? '').trim(),
  };
}

/** Is a real mail server configured? */
export function isEmailConfigured(): boolean {
  const s = emailSettings();
  return Boolean(s.host && s.from);
}

/** A one-line description used by the Admin Panel warning box. */
export function emailStatusText(): string {
  if (isEmailConfigured()) {
    const s = emailSettings();
    return `Email is configured (${s.host}, sending as ${s.from}).`;
  }
  return (
    'Email is NOT configured yet, so verification and reset emails cannot be sent. ' +
    'Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and MAIL_FROM to your .env file.'
  );
}

async function loadNodemailer(): Promise<NodemailerModule | null> {
  try {
    const module = (await import('nodemailer')) as unknown as
      | NodemailerModule
      | { default: NodemailerModule };

    return 'createTransport' in module ? module : module.default;
  } catch {
    return null;
  }
}

// ========================================
// SEND ONE EMAIL
// ========================================
export async function sendMail(input: MailInput): Promise<MailResult> {
  const settings = emailSettings();

  // ---------- No mail server configured ----------
  if (!isEmailConfigured()) {
    console.warn(
      '\n[email] NOT SENT - no mail server is configured.\n' +
        `        Subject : ${input.subject}\n` +
        `        To      : ${input.to}\n` +
        '        Add SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / MAIL_FROM to .env\n' +
        '        The plain-text version follows so you can finish the flow locally:\n' +
        '        ---------------------------------------------------------------\n' +
        input.text
          .split('\n')
          .map((line) => `        ${line}`)
          .join('\n') +
        '\n        ---------------------------------------------------------------\n',
    );

    return {
      ok: false,
      skipped: true,
      error: 'No email server is configured yet (see SMTP_HOST in your .env file).',
    };
  }

  // ---------- No library installed ----------
  const nodemailer = await loadNodemailer();
  if (!nodemailer) {
    console.error('[email] The "nodemailer" package is missing. Run: npm install');
    return { ok: false, error: 'The email library is not installed (run: npm install).' };
  }

  // ---------- Send ----------
  try {
    const transport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.user ? { user: settings.user, pass: settings.password } : undefined,
      // Give up instead of leaving a request hanging for ever.
      connectionTimeout: 12000,
      greetingTimeout: 8000,
      socketTimeout: 20000,
    });

    await transport.sendMail({
      from: `"${settings.fromName}" <${settings.from}>`,
      to: input.to,
      replyTo: settings.replyTo || undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { ok: true };
  } catch (error) {
    // The real error goes to the server log; a short safe message is returned.
    console.error('[email] sending failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The mail server refused the message: ${message}` };
  }
}

// ========================================
// CHECK THE SETUP (used by the rescue script)
// ========================================
/** Try to connect to the mail server. Used by "npm run mail:test". */
export async function verifyMailConnection(): Promise<MailResult> {
  if (!isEmailConfigured()) {
    return { ok: false, skipped: true, error: 'No email server is configured.' };
  }

  const nodemailer = await loadNodemailer();
  if (!nodemailer) return { ok: false, error: 'The email library is not installed.' };

  const settings = emailSettings();

  try {
    const transport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.user ? { user: settings.user, pass: settings.password } : undefined,
      connectionTimeout: 12000,
      greetingTimeout: 8000,
    });

    await transport.verify();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
