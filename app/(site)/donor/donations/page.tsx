// ========================================
// DONOR - OLD ADDRESS FOR THE HISTORY PAGE
// ========================================
// /donor/donations was the first name used for this screen; it is now the Donor
// Dashboard at /donor/dashboard. Both addresses stay alive so that a bookmark, a
// link in an old email, or a link already printed somewhere keeps working.
//
// The redirect is permanent for the browser (308 by default via redirect()), and
// the guard lives on the dashboard itself, so arriving here while signed out
// still ends up at the sign-in page with the right "come back to" address.
// ========================================

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DonorDonationsRedirect() {
  redirect('/donor/dashboard');
}
