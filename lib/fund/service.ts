// ========================================
// FUND MANAGEMENT - BUSINESS LOGIC
// ========================================
// This file contains the actions that CHANGE money records:
//   approve a payment      reject a payment      cancel a payment
//   approve an expense     reject an expense
//
// TWO RULES THAT PROTECT THE ORGANIZATION
//   1. Every change runs inside a DATABASE TRANSACTION. Either all of the
//      steps succeed, or none of them do. A half-finished approval (money
//      counted but no receipt linked) can therefore never happen.
//   2. Every change writes an AUDIT LINE saying who did it, when, and what
//      the value was before and after.
//
// Financial rows are never really deleted. "removePayment" / "removeExpense"
// only hide the row (soft delete), so the history always stays complete.
// ========================================

import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { UserFacingError } from '@/lib/api/crud';
import type { SessionUser } from '@/lib/auth/session';
import { addMonths, monthStart, contributionStatusFor } from '@/lib/fund/calc';

// ========================================
// DUPLICATE TRANSACTION PROTECTION
// ========================================
/**
 * The value stored in FundPayment.txnKey, which the database keeps unique.
 *
 *   pending / approved  ->  "BANK-TXN-12345"
 *   rejected / cancelled -> "BANK-TXN-12345#REJECTED#<row id>"
 *
 * Why: the same bank transaction must never be recorded twice, but if a member
 * makes ONE mistake and the payment is rejected, they must be able to correct
 * it and submit again. Suffixing the key of the rejected row frees the original
 * transaction id while keeping the old row for the audit trail.
 */
export function buildTxnKey(
  transactionId: string,
  status: string,
  rowId?: string | null,
): string {
  const clean = transactionId.trim().toUpperCase().replace(/\s+/g, '');

  if (status === 'REJECTED' || status === 'CANCELLED') {
    return `${clean}#${status}#${rowId ?? 'x'}`;
  }

  return clean;
}

/** Check whether this transaction id is already used by an active payment. */
export async function isTransactionIdTaken(
  transactionId: string,
  ignoreRowId?: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const existing = await prisma.fundPayment.findFirst({
    where: {
      txnKey: buildTxnKey(transactionId, 'PENDING'),
      ...(ignoreRowId ? { id: { not: ignoreRowId } } : {}),
    },
    select: { id: true },
  });

  return Boolean(existing);
}

// ========================================
// NOTIFICATIONS
// ========================================
export type NotifyInput = {
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  link?: string | null;
};

/** Send one notification to one person. */
export async function notify(userId: string, input: NotifyInput): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await prisma.notification.create({
      data: {
        userId,
        title: input.title,
        message: input.message,
        type: input.type ?? 'INFO',
        link: input.link ?? null,
      },
    });
  } catch (error) {
    // A missing notification must never roll back a money record.
    console.error('[fund] could not create the notification:', error);
  }
}

/** Tell every administrator that something needs their attention. */
export async function notifyAdmins(input: NotifyInput): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'FINANCE_ADMIN', 'ADMIN'] }, isActive: true },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: input.title,
        message: input.message,
        type: input.type ?? 'INFO',
        link: input.link ?? null,
      })),
    });
  } catch (error) {
    console.error('[fund] could not notify the administrators:', error);
  }
}

/** How many unread notifications does this person have? */
export async function unreadNotificationCount(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    return await prisma.notification.count({ where: { userId, isRead: false } });
  } catch {
    return 0;
  }
}

// ========================================
// AUDIT TRAIL
// ========================================
export type AuditInput = {
  actor: SessionUser;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'CANCEL';
  entity: string;
  entityId: string;
  detail?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
};

/** Write one line into the financial audit trail. */
export async function writeFundAudit(input: AuditInput): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const stringify = (value: unknown): string | null => {
    if (value === undefined || value === null) return null;
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 2000 ? `${text.slice(0, 1997)}...` : text;
  };

  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actor.id,
        actorName: input.actor.name,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        detail: input.detail ?? null,
        oldValue: stringify(input.oldValue),
        newValue: stringify(input.newValue),
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error('[fund] could not write the audit line:', error);
  }
}

/** Read the caller's address for the audit trail. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || real?.trim() || null;
}

// ========================================
// RECALCULATE ONE MONTH AFTER A MONEY CHANGE
// ========================================
// Runs INSIDE the caller's transaction, so the monthly tracking row and the
// payment row can never disagree.
async function recalculateMonth(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  memberId: string,
  periodMonth: Date,
  dueDay: number,
): Promise<void> {
  const month = monthStart(periodMonth);

  const contribution = await tx.monthlyContribution.findUnique({
    where: { memberId_periodMonth: { memberId, periodMonth: month } },
  });

  if (!contribution) return;

  const paid = await tx.fundPayment.aggregate({
    _sum: { amount: true },
    where: { memberId, periodMonth: month, status: 'APPROVED', isDeleted: false },
  });

  const paidAmount = paid._sum.amount ?? 0;

  const dueDate = addMonths(month, 1);
  dueDate.setDate(Math.min(Math.max(dueDay, 1), 28));

  await tx.monthlyContribution.update({
    where: { id: contribution.id },
    data: {
      paidAmount,
      status: contributionStatusFor(
        contribution.requiredAmount,
        paidAmount,
        dueDate,
        contribution.status,
      ),
    },
  });
}

/** Read the due-day setting (defaults to the 10th). */
async function dueDay(): Promise<number> {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'fund.dueDay' } });
  const value = Number(row?.value ?? '10');
  return Number.isFinite(value) && value >= 1 && value <= 28 ? value : 10;
}

// ========================================
// PAYMENT DECISIONS
// ========================================
export type PaymentDecisionResult = {
  status: string;
  message: string;
};

/**
 * APPROVE a member payment.
 * After this the money counts towards the collection total and, if the payment
 * belongs to a month, the member's monthly status is recalculated.
 */
export async function approvePayment(
  paymentId: string,
  admin: SessionUser,
  note: string | null,
  ip?: string | null,
): Promise<PaymentDecisionResult> {
  const day = await dueDay();

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.fundPayment.findUnique({
      where: { id: paymentId },
      include: { member: { select: { id: true, name: true } } },
    });

    if (!payment || payment.isDeleted) {
      throw new UserFacingError('This payment no longer exists.');
    }

    // Protects against two administrators approving at the same moment.
    if (payment.status === 'APPROVED') {
      throw new UserFacingError('This payment has already been approved.');
    }

    const updated = await tx.fundPayment.update({
      where: { id: paymentId },
      data: {
        status: 'APPROVED',
        reviewNote: note,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        updatedById: admin.id,
        // The transaction id becomes reserved again (see buildTxnKey).
        txnKey: buildTxnKey(payment.transactionId, 'APPROVED', payment.id),
      },
    });

    if (payment.periodMonth) {
      await recalculateMonth(tx, payment.memberId, payment.periodMonth, day);
    }

    return { payment, updated, memberName: payment.member?.name ?? 'Member' };
  });

  await notify(result.payment.memberId, {
    title: 'Fund payment approved',
    message: `Your payment of NRs ${result.payment.amount.toLocaleString('en-IN')} has been verified and added to the fund. Thank you.`,
    type: 'SUCCESS',
    link: '/member/fund/history',
  });

  await writeFundAudit({
    actor: admin,
    action: 'APPROVE',
    entity: 'FundPayment',
    entityId: paymentId,
    detail: `Payment from ${result.memberName}`,
    oldValue: { status: 'PENDING' },
    newValue: { status: 'APPROVED', note },
    ipAddress: ip,
  });

  return { status: 'APPROVED', message: 'The payment has been approved and added to the fund.' };
}

/**
 * REJECT a member payment.
 * The money is NOT added to the fund. The transaction id is freed so the
 * member can correct the details and submit again.
 */
export async function rejectPayment(
  paymentId: string,
  admin: SessionUser,
  note: string,
  ip?: string | null,
): Promise<PaymentDecisionResult> {
  const day = await dueDay();

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.fundPayment.findUnique({
      where: { id: paymentId },
      include: { member: { select: { id: true, name: true } } },
    });

    if (!payment || payment.isDeleted) {
      throw new UserFacingError('This payment no longer exists.');
    }

    if (payment.status === 'APPROVED') {
      throw new UserFacingError(
        'An approved payment cannot be rejected. Cancel it instead so the change stays in the audit trail.',
      );
    }

    const updated = await tx.fundPayment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        reviewNote: note,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        updatedById: admin.id,
        // Frees the transaction id so the member can submit it again.
        txnKey: buildTxnKey(payment.transactionId, 'REJECTED', payment.id),
      },
    });

    if (payment.periodMonth) {
      await recalculateMonth(tx, payment.memberId, payment.periodMonth, day);
    }

    return { payment, updated, memberName: payment.member?.name ?? 'Member' };
  });

  await notify(result.payment.memberId, {
    title: 'Fund payment rejected',
    message: `Your payment of NRs ${result.payment.amount.toLocaleString('en-IN')} could not be verified. Reason: ${note}`,
    type: 'ERROR',
    link: '/member/fund/history',
  });

  await writeFundAudit({
    actor: admin,
    action: 'REJECT',
    entity: 'FundPayment',
    entityId: paymentId,
    detail: `Payment from ${result.memberName}`,
    oldValue: { status: 'PENDING' },
    newValue: { status: 'REJECTED', note },
    ipAddress: ip,
  });

  return { status: 'REJECTED', message: 'The payment has been rejected and the member informed.' };
}

/**
 * CANCEL a payment (for example the member reported a wrong entry, or an
 * approved payment was reversed). The record is kept, never deleted.
 */
export async function cancelPayment(
  paymentId: string,
  admin: SessionUser,
  reason: string | null,
  ip?: string | null,
): Promise<PaymentDecisionResult> {
  const day = await dueDay();

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.fundPayment.findUnique({ where: { id: paymentId } });

    if (!payment || payment.isDeleted) {
      throw new UserFacingError('This payment no longer exists.');
    }

    if (payment.status === 'CANCELLED') {
      throw new UserFacingError('This payment has already been cancelled.');
    }

    const updated = await tx.fundPayment.update({
      where: { id: paymentId },
      data: {
        status: 'CANCELLED',
        reviewNote: reason,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        updatedById: admin.id,
        txnKey: buildTxnKey(payment.transactionId, 'CANCELLED', payment.id),
      },
    });

    if (payment.periodMonth) {
      await recalculateMonth(tx, payment.memberId, payment.periodMonth, day);
    }

    return { payment, updated };
  });

  await notify(result.payment.memberId, {
    title: 'Fund payment cancelled',
    message: `Your payment of NRs ${result.payment.amount.toLocaleString('en-IN')} has been cancelled.${
      reason ? ` Reason: ${reason}` : ''
    }`,
    type: 'WARNING',
    link: '/member/fund/history',
  });

  await writeFundAudit({
    actor: admin,
    action: 'CANCEL',
    entity: 'FundPayment',
    entityId: paymentId,
    oldValue: { status: result.payment.status },
    newValue: { status: 'CANCELLED', reason },
    ipAddress: ip,
  });

  return {
    status: 'CANCELLED',
    message: 'The payment has been cancelled. The fund balance has been updated.',
  };
}

/** Hide a payment without destroying the record (soft delete). */
export async function removePayment(
  paymentId: string,
  admin: SessionUser,
  ip?: string | null,
): Promise<void> {
  const day = await dueDay();

  const payment = await prisma.$transaction(async (tx) => {
    const found = await tx.fundPayment.findUnique({ where: { id: paymentId } });
    if (!found) throw new UserFacingError('This payment no longer exists.');

    await tx.fundPayment.update({
      where: { id: paymentId },
      data: {
        isDeleted: true,
        status: 'CANCELLED',
        updatedById: admin.id,
        txnKey: buildTxnKey(found.transactionId, 'CANCELLED', found.id),
      },
    });

    if (found.periodMonth) {
      await recalculateMonth(tx, found.memberId, found.periodMonth, day);
    }

    return found;
  });

  await writeFundAudit({
    actor: admin,
    action: 'DELETE',
    entity: 'FundPayment',
    entityId: paymentId,
    detail: 'Payment hidden (soft delete). The record is kept for the audit trail.',
    oldValue: { status: payment.status },
    newValue: { isDeleted: true },
    ipAddress: ip,
  });
}

// ========================================
// EXPENSE DECISIONS
// ========================================
/**
 * APPROVE an expense. ONLY a Super Administrator may do this - the check
 * happens in the API route before this function is called.
 */
export async function approveExpense(
  expenseId: string,
  admin: SessionUser,
  note: string | null,
  ip?: string | null,
): Promise<PaymentDecisionResult> {
  const expense = await prisma.$transaction(async (tx) => {
    const found = await tx.expense.findUnique({ where: { id: expenseId } });

    if (!found || found.isDeleted) {
      throw new UserFacingError('This expense no longer exists.');
    }

    if (found.status === 'APPROVED') {
      throw new UserFacingError('This expense has already been approved.');
    }

    return tx.expense.update({
      where: { id: expenseId },
      data: {
        status: 'APPROVED',
        reviewNote: note,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        updatedById: admin.id,
      },
    });
  });

  if (expense.addedById) {
    await notify(expense.addedById, {
      title: 'Expense approved',
      message: `The expense "${expense.title}" of NRs ${expense.amount.toLocaleString('en-IN')} has been approved.`,
      type: 'SUCCESS',
      link: '/admin/fund/expenses',
    });
  }

  await writeFundAudit({
    actor: admin,
    action: 'APPROVE',
    entity: 'Expense',
    entityId: expenseId,
    detail: expense.title,
    oldValue: { status: 'PENDING' },
    newValue: { status: 'APPROVED', note },
    ipAddress: ip,
  });

  return { status: 'APPROVED', message: 'The expense has been approved and subtracted from the balance.' };
}

/** REJECT an expense. It never affects the fund balance. */
export async function rejectExpense(
  expenseId: string,
  admin: SessionUser,
  note: string,
  ip?: string | null,
): Promise<PaymentDecisionResult> {
  const expense = await prisma.$transaction(async (tx) => {
    const found = await tx.expense.findUnique({ where: { id: expenseId } });

    if (!found || found.isDeleted) {
      throw new UserFacingError('This expense no longer exists.');
    }

    if (found.status === 'APPROVED') {
      throw new UserFacingError(
        'An approved expense cannot be rejected. Cancel it instead so the change stays in the audit trail.',
      );
    }

    return tx.expense.update({
      where: { id: expenseId },
      data: {
        status: 'REJECTED',
        reviewNote: note,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        updatedById: admin.id,
      },
    });
  });

  if (expense.addedById) {
    await notify(expense.addedById, {
      title: 'Expense rejected',
      message: `The expense "${expense.title}" was rejected. Reason: ${note}`,
      type: 'ERROR',
      link: '/admin/fund/expenses',
    });
  }

  await writeFundAudit({
    actor: admin,
    action: 'REJECT',
    entity: 'Expense',
    entityId: expenseId,
    detail: expense.title,
    oldValue: { status: 'PENDING' },
    newValue: { status: 'REJECTED', note },
    ipAddress: ip,
  });

  return { status: 'REJECTED', message: 'The expense has been rejected.' };
}

/** Hide an expense without destroying the record (soft delete). */
export async function removeExpense(
  expenseId: string,
  admin: SessionUser,
  ip?: string | null,
): Promise<void> {
  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: { isDeleted: true, updatedById: admin.id },
  });

  await writeFundAudit({
    actor: admin,
    action: 'DELETE',
    entity: 'Expense',
    entityId: expenseId,
    detail: 'Expense hidden (soft delete). The record is kept for the audit trail.',
    oldValue: { title: expense.title, status: expense.status },
    newValue: { isDeleted: true },
    ipAddress: ip,
  });
}
