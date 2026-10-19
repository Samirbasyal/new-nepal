// ========================================
// API - MEMBER PANEL: SUBMIT A FUND PAYMENT
// ========================================
// Address: POST /api/member/fund/pay
//
// The member has already transferred the money to one of the organization's
// bank accounts. Here they tell us about it so the office can verify it.
//
// WHAT THIS ROUTE ENFORCES (all on the server)
//   1. The member is taken from the SIGNED-IN SESSION - never from the form.
//      Nobody can submit a payment in somebody else's name.
//   2. The chosen bank must exist AND be switched on.
//   3. The amount, date and transaction id are validated (lib/fund/schemas.ts).
//   4. The same transaction id can never be submitted twice.
//   5. A receipt is required when the organization has switched that on.
//   6. The payment always starts as PENDING. A member can never approve their
//      own money - that is the administrator's job.
//   7. The member's monthly row is created if it does not exist yet, so their
//      month-by-month record stays complete.
//
// The new payment does NOT change the fund balance. Only an administrator
// approving it does (see lib/fund/service.ts).
// ========================================

import { fail, ok, readJson, zodFieldErrors } from '@/lib/api/http';
import { requireMemberApi } from '@/lib/api/guard';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { memberPaymentSubmitSchema } from '@/lib/fund/schemas';
import { buildTxnKey, isTransactionIdTaken, notifyAdmins, notify, clientIp, writeFundAudit } from '@/lib/fund/service';
import { formatMoney, monthStart, ensureContribution } from '@/lib/fund/calc';
import { paymentMethodForAccount } from '@/lib/constants';
import { readSettingValue } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) {
    return fail('The database is not set up yet.', 503);
  }

  const body = await readJson(request);
  const parsed = memberPaymentSubmitSchema.safeParse(body);

  if (!parsed.success) {
    return fail('Please check the form and try again.', 422, zodFieldErrors(parsed.error));
  }

  const data = parsed.data;
  const memberId = auth.user.id; // always from the session, never from the form

  try {
    // ---------- 1. Monthly amount + rules from the settings ----------
    const [monthlyAmountText, receiptRequiredText, allowPartialText] = await Promise.all([
      // Rs. 20 by default - the same fallback as lib/settings.ts and the pages.
      readSettingValue('fund.monthlyAmount', '20'),
      readSettingValue('fund.receiptRequired', 'true'),
      readSettingValue('fund.allowPartial', 'true'),
    ]);

    const monthlyAmount = Number(monthlyAmountText) || 20;
    const receiptRequired = receiptRequiredText.toLowerCase() !== 'false';
    const allowPartial = allowPartialText.toLowerCase() !== 'false';

    // ---------- 2. Receipt required? ----------
    if (receiptRequired && !data.receiptUrl) {
      return fail('Please attach the payment receipt or screenshot.', 422, {
        receiptUrl: 'A receipt is required for every payment.',
      });
    }

    // ---------- 3. Partial payments allowed? ----------
    if (!allowPartial && data.amount < monthlyAmount) {
      return fail(
        `Partial payments are not accepted. The monthly amount is ${formatMoney(monthlyAmount)}.`,
        422,
        { amount: `Please enter at least ${formatMoney(monthlyAmount)}.` },
      );
    }

    // ---------- 4. The bank must exist and be switched on ----------
    const bank = await prisma.bank.findUnique({ where: { id: data.bankId } });

    if (!bank) {
      return fail('The selected bank could not be found.', 422, {
        bankId: 'Please choose a bank from the list.',
      });
    }

    if (!bank.isActive) {
      return fail(
        'That bank account is no longer accepting payments. Please choose another bank.',
        422,
        { bankId: 'This bank has been switched off.' },
      );
    }

    // ---------- 5. Duplicate transaction id ----------
    if (await isTransactionIdTaken(data.transactionId)) {
      return fail(
        'This transaction ID has already been submitted. If you made a mistake, please contact the office.',
        409,
        { transactionId: 'This transaction ID is already recorded.' },
      );
    }

    // ---------- 6. Which month does this payment belong to? ----------
    // If the member did not choose a month we assume the current one, which is
    // what a monthly contribution normally means.
    const periodMonth = data.periodMonth ? monthStart(data.periodMonth) : monthStart(new Date());

    // ---------- 6b. No accidental second submission for the same month ----------
    // A member who clicks twice, or comes back the next day unsure whether it
    // worked, must not create a second request for the same period. The check is
    // on the server, so it holds even if the page is refreshed or reopened.
    //
    // Partial payments are deliberately still possible when the office allows
    // them (the setting in the Admin Panel), but the SAME amount twice is always
    // treated as a duplicate - that is a double click, not two payments.
    const pendingThisMonth = await prisma.fundPayment.findFirst({
      where: { memberId, periodMonth, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true },
    });

    if (pendingThisMonth && (!allowPartial || pendingThisMonth.amount === data.amount)) {
      return fail(
        'You already have a payment for this month waiting for approval. Please wait for the office to verify it before submitting another one.',
        409,
        { periodMonth: 'A payment for this month is already waiting for approval.' },
      );
    }

    // Make sure their monthly row exists before the payment points at it.
    await ensureContribution(memberId, periodMonth, monthlyAmount);

    // ---------- 7. Which fund category? ----------
    let fundCategoryId = data.fundCategoryId;

    if (!fundCategoryId) {
      // Fall back to the monthly fund category so reports stay clean.
      const monthlyCategory = await prisma.fundCategory.findFirst({
        where: { isSystem: true, slug: 'monthly-member-fund' },
        select: { id: true },
      });
      fundCategoryId = monthlyCategory?.id ?? null;
    }

    // ---------- 8. Save the payment as PENDING ----------
    const payment = await prisma.fundPayment.create({
      data: {
        memberId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        // HOW the member paid: a bank transfer, eSewa or Khalti. It is taken
        // from the account they chose, so the reports can show which method is
        // actually being used.
        method: paymentMethodForAccount(bank.methodType),
        bankId: bank.id,
        // A copy of the bank name, so old receipts stay correct even if the
        // bank is renamed or switched off later.
        bankNameSnapshot: bank.name,
        transactionId: data.transactionId.trim(),
        txnKey: buildTxnKey(data.transactionId, 'PENDING'),
        referenceNumber: data.referenceNumber,
        receiptUrl: data.receiptUrl,
        fundCategoryId,
        description: data.note,
        periodMonth,
        status: 'PENDING',
        createdById: memberId,
        updatedById: memberId,
      },
      select: { id: true, amount: true, status: true },
    });

    // ---------- 9. Tell the member and the administrators ----------
    await notify(memberId, {
      title: 'Payment submitted',
      message: `Your payment of ${formatMoney(data.amount)} has been submitted and is waiting for verification.`,
      type: 'INFO',
      link: '/member/fund/history',
    });

    await notifyAdmins({
      title: 'New fund payment requires verification',
      message: `${auth.user.name} submitted ${formatMoney(data.amount)} (transaction ${data.transactionId.trim()}).`,
      type: 'WARNING',
      link: '/admin/fund/pending',
    });

    await writeFundAudit({
      actor: auth.user,
      action: 'CREATE',
      entity: 'FundPayment',
      entityId: payment.id,
      detail: `Member submitted a payment of ${formatMoney(data.amount)}`,
      newValue: { amount: data.amount, status: 'PENDING', transactionId: data.transactionId },
      ipAddress: clientIp(request),
    });

    // Does this payment finish the month, or is it more than needed?
    const isOverpayment = data.amount > monthlyAmount;

    return ok(
      {
        paymentId: payment.id,
        status: 'PENDING',
        isOverpayment,
        monthlyAmount,
        // Extra line shown when the member paid more than the monthly amount.
        extraNote: isOverpayment
          ? `${formatMoney(data.amount - monthlyAmount)} more than the monthly amount was recorded and will be counted as an extra contribution.`
          : null,
      },
      201,
      'Your payment has been submitted and is waiting for verification.',
    );
  } catch (error) {
    console.error('[fund] payment submission failed:', error);
    return fail('The payment could not be saved. Please try again.', 500);
  }
}
