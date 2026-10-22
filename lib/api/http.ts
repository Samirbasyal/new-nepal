// ========================================
// API - SHARED RESPONSE HELPERS
// ========================================
// Every API route in this project answers in the same JSON shape:
//
//   SUCCESS:  { ok: true,  data: ... }
//   ERROR:    { ok: false, error: "message", fields: { email: "..." } }
//
// Keeping one shape means the Admin Panel only needs one way to read answers.
// ========================================

import { NextResponse } from 'next/server';

export type ApiSuccess<T> = { ok: true; data: T; message?: string };
export type ApiError = { ok: false; error: string; fields?: Record<string, string> };

/**
 * Send a successful answer.
 * "message" is an optional friendly sentence shown by the form.
 */
export function ok<T>(data: T, status = 200, message?: string) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data, message }, { status });
}

/** Send a plain error message. */
export function fail(error: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json<ApiError>({ ok: false, error, fields }, { status });
}

// ========================================
// READY-MADE ERROR ANSWERS
// Using the same wording everywhere makes the website easier to understand.
// ========================================

/** 401 - nobody is logged in. */
export function unauthorized(message = 'You must be signed in to do this.') {
  return fail(message, 401);
}

/** 403 - logged in, but not allowed. Members receive this on admin routes. */
export function forbidden(message = 'You are not authorized to access this page.') {
  return fail(message, 403);
}

/** 404 - the record does not exist. */
export function notFound(message = 'The requested item could not be found.') {
  return fail(message, 404);
}

/**
 * 500 - something unexpected went wrong.
 *
 * Two ways of calling it, because both are in use across the project:
 *
 *   serverError()                       -> the standard sentence
 *   serverError('Could not save X.')    -> a specific sentence
 *   serverError(error, 'Could not ...') -> a specific sentence, AND the real
 *                                          error is printed in the server log
 *
 * The third form used to fail to compile ("Expected 0-1 arguments") because this
 * function only accepted the message. Keeping the error in the log matters: a
 * vague sentence in the browser is fine, but somebody has to be able to find out
 * what actually broke.
 */
export function serverError(
  messageOrError: unknown = 'Something went wrong. Please try again.',
  message?: string,
) {
  if (typeof messageOrError === 'string') return fail(messageOrError, 500);

  console.error('[api] unexpected error:', messageOrError);
  return fail(message ?? 'Something went wrong. Please try again.', 500);
}

// ========================================
// PARSE THE REQUEST BODY SAFELY
// ========================================
/**
 * Read JSON from a request without throwing on empty/invalid bodies.
 * Returns null when the body is not usable JSON.
 */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Turn a Zod error into the "fields" object used by the forms, so each
 * problem appears under the matching input box.
 */
type ZodIssueLike = { path: (string | number)[]; message: string };

export function zodFieldErrors(input: ZodIssueLike[] | { issues: ZodIssueLike[] }) {
  // Accept both a plain list of issues and a full ZodError object, so API
  // routes can pass whichever they already have.
  const issues = Array.isArray(input) ? input : input.issues;

  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/** Turn a Zod error into one readable sentence. */
export function zodMessage(issues: { path: (string | number)[]; message: string }[]) {
  const first = issues[0];
  if (!first) return 'Please check the form and try again.';
  const field = first.path.join('.');
  return field ? `${field}: ${first.message}` : first.message;
}
