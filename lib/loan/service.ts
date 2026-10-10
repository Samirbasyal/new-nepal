// ========================================
// LOAN MANAGEMENT - THE ACTIONS
// ========================================
// Every change to a loan goes through this file: creating it, approving it,
// refusing it, paying it out, recording a repayment and completing it.
//
// WHY ACTIONS AND NOT PLAIN FORM EDITS
//   A loan's status must never be typed in by hand. If it could be, one wrong
//   dropdown would say "completed" while the money is still out. So the form
//   cannot touch the status at all, and the only way to move a loan forward is
//   one of the actions below, each of which:
//       1. checks that the step makes sense at this moment,
//       2. writes the change and its audit line inside ONE transaction,
//       3. and tells the member what happened.
//
// NOTHING HERE TOUCHES THE MONTHLY MEMBER FUND.
//   Loan money and member-fund money are kept in separate tables and separate
//   totals on purpose (see lib/loan/calc.ts).
// ========================================

import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { writeActivity } from '@/lib/audit';
import { notifyAdmins, notifyUser } from '@/lib/notifications';
import { readSettingValue } from '@/lib/settings';
import { UserFacingError } from '@/lib/api/crud';
import { formatMoney } from '@/lib/fund/calc';
import { deriveLoanStatus, loanFigures } from '@/lib/loan/calc';
import { isFinalLoanStatus } from '@/lib/loan/schemas';

// ========================================
// THE LOAN NUMBER
// ========================================
/**
 * The next number in the series, for example LN-2026-0007.
 *
 * It is built from how many loans already exist this year, and we try again if
 * two administrators happen to save at the same instant and pick the same
 * number (the database also has a unique rule as a second guard).
 */
export async function nextLoanNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LN-${year}-`;

  const last = await prisma.loan.findFirst({
    where: { loanNo: { startsWith: prefix } },
    orderBy: { loanNo: 'desc' },
    select: { loanNo: true },
  });

  const lastNumber = last ? Number.parseInt(last.loanNo.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  return `${prefix}${String(next).padStart(4, '0')}`;
}

/** Try a few times to find a number nobody is using yet. */
async function reserveLoanNo(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await nextLoanNo();
    const taken = await prisma.loan.findUnique({ where: { loanNo: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }

  // Fall back to something that cannot clash: the time in milliseconds.
  return `LN-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
}

// ========================================
// RECALCULATE ONE LOAN
// ========================================
/**
 * Bring a loan's status back in line with its repayments.
 *
 * This is called after every repayment, and whenever the loan screens are
 * opened, so a loan that has just been fully repaid says "Completed" straight
 * away without anybody having to remember to change it.
 *
 * It also sends the two notifications that depend on the passage of time:
 *   - "your loan is overdue"  (sent once, when the deadline first passes)
 *   - "congratulations, fully repaid"
 */
export async function recalculateLoan(loanId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        returns: { select: { amount: true, isDeleted: true, returnDate: true } },
        member: { select: { id: true, name: true } },
      },
    });

    if (!loan) return;

    const nextStatus = deriveLoanStatus(loan);

    if (nextStatus === loan.status) return;

    await prisma.loan.update({ where: { id: loan.id }, data: { status: nextStatus } });

    await writeActivity({
      actorId: null,
      actorName: 'System',
      action: 'UPDATE',
      entity: 'Loan status',
      entityId: loan.id,
      detail: `${loan.loanNo}: ${loan.status} -> ${nextStatus} (worked out from the repayment records)`,
      oldValue: loan.status,
      newValue: nextStatus,
    });

    // ---------- Tell the member ----------
    const figures = loanFigures(loan);

    if (nextStatus === 'COMPLETED') {
      await notifyUser({
        userId: loan.memberId,
        title: 'Loan fully repaid',
        message: `Congratulations - your loan ${loan.loanNo} of ${formatMoney(
          figures.payable,
        )} has been fully repaid. Thank you.`,
        type: 'SUCCESS',
        link: '/member/loans',
        email: true,
      });
    }

    if (nextStatus === 'OVERDUE') {
      await notifyUser({
        userId: loan.memberId,
        title: 'Loan repayment is overdue',
        message: `The repayment deadline for loan ${loan.loanNo} has passed. ${formatMoney(
          figures.remaining,
        )} is still outstanding. Please contact the office.`,
        type: 'WARNING',
        link: '/member/loans',
        email: true,
      });
    }
  } catch (error) {
    console.error('[loan] could not recalculate the loan:', error);
  }
}

// ========================================
// LOAD ONE LOAN (with the member and repayments)
// ========================================
async function loadLoan(loanId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      returns: { where: { isDeleted: false }, orderBy: { returnDate: 'asc' } },
      member: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!loan || loan.isDeleted) {
    throw new UserFacingError('This loan no longer exists.', 404);
  }

  return loan;
}

/** The office's own record of the audit line for one action. */
async function writeLoanAudit(input: {
  actorId: string;
  actorName: string;
  loanId: string;
  loanNo: string;
  detail: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  await writeActivity({
    actorId: input.actorId,
    actorName: input.actorName,
    action: 'UPDATE',
    entity: 'Loan',
    entityId: input.loanId,
    detail: `${input.loanNo}: ${input.detail}`,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
  });
}

// ========================================
// 1. CREATE A LOAN
// ========================================
/**
 * Add a loan for a member.
 *
 * The loan starts as PENDING: no money is considered to have moved yet. If the
 * office already handed the money over, they can record it as disbursed
 * afterwards (or set the dates and approve it), so the figures stay honest.
 */
export async function createLoan(
  data: Record<string, unknown>,
  actor: { id: string; name: string },
): Promise<Record<string, unknown>> {
  if (!isDatabaseConfigured()) {
    throw new UserFacingError('The database is not connected.', 503);
  }

  const memberId = String(data.memberId ?? '');
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!member) {
    throw new UserFacingError('Please choose a member. The account was not found.', 422);
  }

  const principalAmount = Number(data.principalAmount ?? 0);
  const interestAmount = Number(data.interestAmount ?? 0);

  if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
    throw new UserFacingError('The loan amount must be more than zero.', 422);
  }

  const principal = Math.round(principalAmount);
  const interest = interestAmount > 0 ? Math.round(interestAmount) : 0;

  const loanNo = await reserveLoanNo();

  const created = await prisma.loan.create({
    data: {
      loanNo,
      // A REQUIRED link has to be written as a relation ("connect"), not as a
      // loose id. Passing only memberId makes Prisma look for the relation
      // itself, refuse the save and answer "Argument `member` is missing." -
      // which is exactly what happened before, and how this was found.
      member: { connect: { id: member.id } },
      principalAmount: principal,
      interestAmount: interest,
      currency: (data.currency as string) || 'NPR',
      requestedDate: (data.requestedDate as Date) ?? null,
      givenDate: (data.givenDate as Date) ?? null,
      disbursedDate: (data.disbursedDate as Date) ?? null,
      expectedReturnDate: (data.expectedReturnDate as Date) ?? null,
      purpose: (data.purpose as string) ?? null,
      agreementNote: (data.agreementNote as string) ?? null,
      installments: Number(data.installments ?? 0) || null,
      agreementSigned: Boolean(data.agreementSigned),
      agreementNo: (data.agreementNo as string) ?? null,
      agreementDate: (data.agreementDate as Date) ?? null,
      agreementStatus: (data.agreementStatus as string) ?? 'PENDING',
      agreementUrl: (data.agreementUrl as string) ?? null,
      supportingUrl: (data.supportingUrl as string) ?? null,
      notes: (data.notes as string) ?? null,
      status: 'PENDING',
      createdBy: { connect: { id: actor.id } },
      // updatedById has no relation of its own, so it stays a plain column.
      updatedById: actor.id,
    },
  });

  await writeLoanAudit({
    actorId: actor.id,
    actorName: actor.name,
    loanId: created.id,
    loanNo: created.loanNo,
    detail: `created for ${member.name}: ${formatMoney(principal)}${
      interest > 0 ? ` + ${formatMoney(interest)} interest` : ''
    }`,
    newValue: 'PENDING',
  });

  // ---------- Tell the office and the member ----------
  await notifyAdmins({
    title: 'New loan record created',
    message: `${actor.name} created loan ${created.loanNo} for ${member.name} (${formatMoney(
      principal + interest,
    )}).`,
    type: 'INFO',
    link: `/admin/loans/${created.id}`,
    exceptUserId: actor.id,
  });

  await notifyUser({
    userId: member.id,
    title: 'Loan record created',
    message: `A loan of ${formatMoney(principal + interest)} has been recorded for you (${created.loanNo}).`,
    type: 'INFO',
    link: '/member/loans',
  });

  return created as unknown as Record<string, unknown>;
}

// ========================================
// 2. MOVE A LOAN THROUGH ITS STEPS
// ========================================
// One function for all the decisions, so every one of them checks the same
// things the same way.
export async function decideLoan(input: {
  loanId: string;
  action: 'UNDER_REVIEW' | 'APPROVE' | 'REJECT' | 'DISBURSE' | 'CANCEL';
  reason?: string | null;
  disbursedDate?: Date | null;
  actor: { id: string; name: string };
}): Promise<{ status: string; message: string }> {
  const loan = await loadLoan(input.loanId);
  const current = String(loan.status).toUpperCase();

  if (isFinalLoanStatus(current)) {
    throw new UserFacingError(
      current === 'REJECTED'
        ? 'This loan was rejected, so it cannot be changed. Create a new loan instead.'
        : 'This loan was cancelled, so it cannot be changed.',
    );
  }

  const figures = loanFigures(loan);
  const actorName = input.actor.name;

  // ---------- UNDER REVIEW ----------
  if (input.action === 'UNDER_REVIEW') {
    if (current !== 'PENDING') {
      throw new UserFacingError('Only a loan that is still pending can be marked as under review.');
    }

    await prisma.loan.update({ where: { id: loan.id }, data: { status: 'UNDER_REVIEW' } });

    await writeLoanAudit({
      actorId: input.actor.id,
      actorName,
      loanId: loan.id,
      loanNo: loan.loanNo,
      detail: 'moved to Under review',
      oldValue: current,
      newValue: 'UNDER_REVIEW',
    });

    return { status: 'UNDER_REVIEW', message: `${loan.loanNo} is now under review.` };
  }

  // ---------- APPROVE ----------
  if (input.action === 'APPROVE') {
    if (!['PENDING', 'UNDER_REVIEW'].includes(current)) {
      throw new UserFacingError('This loan has already been approved (or is further along).');
    }

    // Should the signed paper be with us first? The organization decides in
    // Settings -> Loans. Off by default, because the office often approves
    // first and collects the signature when the money is handed over.
    const requireAgreement =
      (await readSettingValue('loan.requireAgreementBeforeApproval', 'false')).toLowerCase() === 'true';

    if (requireAgreement && !loan.agreementSigned && loan.agreementStatus !== 'NOT_REQUIRED') {
      throw new UserFacingError(
        'The signed agreement must be recorded before this loan can be approved ' +
          '(Admin Panel -> Settings -> Loans).',
      );
    }

    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        status: 'APPROVED',
        approvedBy: { connect: { id: input.actor.id } },
        approvedAt: new Date(),
        updatedById: input.actor.id,
        // A rejection reason from an earlier attempt no longer applies.
        rejectionReason: null,
      },
    });

    await writeLoanAudit({
      actorId: input.actor.id,
      actorName,
      loanId: loan.id,
      loanNo: loan.loanNo,
      detail: `approved ${formatMoney(figures.payable)}`,
      oldValue: current,
      newValue: 'APPROVED',
    });

    await notifyUser({
      userId: loan.memberId,
      title: 'Loan request approved',
      message: `Your loan request ${loan.loanNo} of ${formatMoney(figures.payable)} has been approved.`,
      type: 'SUCCESS',
      link: '/member/loans',
      email: true,
    });

    return { status: 'APPROVED', message: `${loan.loanNo} approved.` };
  }

  // ---------- REJECT ----------
  if (input.action === 'REJECT') {
    if (!['PENDING', 'UNDER_REVIEW'].includes(current)) {
      throw new UserFacingError('A loan that has been approved or paid out cannot be rejected.');
    }

    const reason = (input.reason ?? '').trim();
    if (reason.length < 3) {
      throw new UserFacingError('Please write the reason for rejecting this loan.');
    }

    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        updatedById: input.actor.id,
      },
    });

    await writeLoanAudit({
      actorId: input.actor.id,
      actorName,
      loanId: loan.id,
      loanNo: loan.loanNo,
      detail: `rejected: ${reason}`,
      oldValue: current,
      newValue: 'REJECTED',
    });

    await notifyUser({
      userId: loan.memberId,
      title: 'Loan request rejected',
      message: `Your loan request ${loan.loanNo} was rejected. Reason: ${reason}`,
      type: 'WARNING',
      link: '/member/loans',
      email: true,
    });

    return { status: 'REJECTED', message: `${loan.loanNo} rejected. The reason was saved.` };
  }

  // ---------- DISBURSE (the money actually changes hands) ----------
  if (input.action === 'DISBURSE') {
    if (current !== 'APPROVED') {
      throw new UserFacingError('Please approve the loan before recording that the money was handed over.');
    }

    const when = input.disbursedDate ?? new Date();

    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        status: 'DISBURSED',
        disbursedDate: when,
        givenDate: loan.givenDate ?? when,
        updatedById: input.actor.id,
      },
    });

    await writeLoanAudit({
      actorId: input.actor.id,
      actorName,
      loanId: loan.id,
      loanNo: loan.loanNo,
      detail: `money handed over: ${formatMoney(figures.payable)}`,
      oldValue: current,
      newValue: 'DISBURSED',
    });

    await notifyUser({
      userId: loan.memberId,
      title: 'Loan paid out',
      message: `Your loan ${loan.loanNo} of ${formatMoney(figures.payable)} has been paid out. Please repay it by the agreed date.`,
      type: 'INFO',
      link: '/member/loans',
      email: true,
    });

    return { status: 'DISBURSED', message: `${loan.loanNo} marked as paid out.` };
  }

  // ---------- CANCEL ----------
  const reason = (input.reason ?? '').trim();
  if (reason.length < 3) {
    throw new UserFacingError('Please write the reason for cancelling this loan.');
  }

  if (figures.returned > 0) {
    throw new UserFacingError(
      'Money has already been repaid against this loan, so it cannot be cancelled. ' +
        'Please record the repayments instead.',
    );
  }

  await prisma.loan.update({
    where: { id: loan.id },
    data: { status: 'CANCELLED', rejectionReason: reason, updatedById: input.actor.id },
  });

  await writeLoanAudit({
    actorId: input.actor.id,
    actorName,
    loanId: loan.id,
    loanNo: loan.loanNo,
    detail: `cancelled: ${reason}`,
    oldValue: current,
    newValue: 'CANCELLED',
  });

  await notifyUser({
    userId: loan.memberId,
    title: 'Loan cancelled',
    message: `Loan ${loan.loanNo} was cancelled. Reason: ${reason}`,
    type: 'WARNING',
    link: '/member/loans',
  });

  return { status: 'CANCELLED', message: `${loan.loanNo} cancelled.` };
}

// ========================================
// 3. RECORD A REPAYMENT
// ========================================
/**
 * Add one amount that came back.
 *
 * Partial repayments are completely normal: the loan only becomes Completed
 * when the sum of the repayments reaches the payable amount, and the remaining
 * balance is worked out from the records every time (never stored).
 */
export async function recordLoanReturn(
  data: Record<string, unknown>,
  actor: { id: string; name: string },
): Promise<{ returnId: string; remaining: number; status: string }> {
  const loan = await loadLoan(String(data.loanId ?? ''));

  if (isFinalLoanStatus(String(loan.status))) {
    throw new UserFacingError('This loan was rejected or cancelled, so no repayment can be recorded.');
  }

  if (!loan.disbursedDate && !loan.givenDate) {
    throw new UserFacingError(
      'The money has not been recorded as handed over yet. Please mark the loan as paid out first.',
    );
  }

  const amount = Math.round(Number(data.amount ?? 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new UserFacingError('The repayment amount must be more than zero.', 422);
  }

  const figures = loanFigures(loan);

  if (figures.remaining === 0) {
    throw new UserFacingError('This loan has already been repaid in full.');
  }

  if (amount > figures.remaining) {
    // 422 = "the values were readable but do not make sense" - the same answer
    // the rest of this project gives for a figure it cannot accept.
    throw new UserFacingError(
      `That is more than the outstanding balance. Only ${formatMoney(figures.remaining)} is left on ${loan.loanNo}.`,
      422,
    );
  }

  const created = await prisma.loanReturn.create({
    data: {
      // Again a required link, so it is written as a relation.
      loan: { connect: { id: loan.id } },
      amount,
      returnDate: (data.returnDate as Date) ?? new Date(),
      method: (data.method as string) ?? 'CASH',
      referenceNumber: (data.referenceNumber as string) ?? null,
      proofUrl: (data.proofUrl as string) ?? null,
      notes: (data.notes as string) ?? null,
      recordedBy: { connect: { id: actor.id } },
    },
  });

  await writeLoanAudit({
    actorId: actor.id,
    actorName: actor.name,
    loanId: loan.id,
    loanNo: loan.loanNo,
    detail: `repayment recorded: ${formatMoney(amount)}`,
    newValue: formatMoney(figures.returned + amount),
  });

  // Bring the status back in line with the money (this also sends the
  // "fully repaid" and "overdue" notifications when they apply).
  await recalculateLoan(loan.id);

  const fresh = await prisma.loan.findUnique({
    where: { id: loan.id },
    include: { returns: { select: { amount: true, isDeleted: true, returnDate: true } } },
  });

  const after = fresh ? loanFigures(fresh) : { remaining: figures.remaining - amount };

  await notifyUser({
    userId: loan.memberId,
    title: 'Loan repayment recorded',
    message: `A repayment of ${formatMoney(amount)} was recorded for loan ${loan.loanNo}. ${
      after.remaining > 0 ? `${formatMoney(after.remaining)} is still outstanding.` : 'The loan is now fully repaid.'
    }`,
    type: 'SUCCESS',
    link: '/member/loans',
  });

  return {
    returnId: created.id,
    remaining: after.remaining,
    status: fresh ? deriveLoanStatus(fresh) : String(loan.status),
  };
}

// ========================================
// 4. REMOVE A REPAYMENT (soft delete)
// ========================================
/**
 * A wrongly typed repayment is HIDDEN, not really deleted, so the audit trail
 * stays complete. The loan balance is recalculated straight away.
 */
export async function removeLoanReturn(
  id: string,
  actor: { id: string; name: string },
): Promise<void> {
  const row = await prisma.loanReturn.findUnique({
    where: { id },
    include: { loan: { select: { id: true, loanNo: true } } },
  });

  if (!row || row.isDeleted) {
    throw new UserFacingError('This repayment no longer exists.', 404);
  }

  await prisma.loanReturn.update({
    where: { id },
    data: { isDeleted: true, updatedAt: new Date() },
  });

  await writeLoanAudit({
    actorId: actor.id,
    actorName: actor.name,
    loanId: row.loanId,
    loanNo: row.loan.loanNo,
    detail: `repayment of ${formatMoney(row.amount)} removed`,
    oldValue: formatMoney(row.amount),
    newValue: null,
  });

  await recalculateLoan(row.loanId);
}

// ========================================
// 5. REMOVE A LOAN (soft delete)
// ========================================
/**
 * A loan is hidden rather than deleted. Super Admin only (see the
 * deleteSuperAdminOnly flag in lib/api/resources.ts), because removing a loan
 * changes the totals in the reports.
 */
export async function deleteLoan(id: string, actor: { id: string; name: string }): Promise<void> {
  const loan = await loadLoan(id);

  const figures = loanFigures(loan);

  if (figures.returned > 0) {
    throw new UserFacingError(
      'This loan has repayments recorded against it, so it cannot be removed. ' +
        'Cancelling the loan keeps the history readable.',
    );
  }

  await prisma.loan.update({ where: { id }, data: { isDeleted: true } });

  await writeLoanAudit({
    actorId: actor.id,
    actorName: actor.name,
    loanId: loan.id,
    loanNo: loan.loanNo,
    detail: `removed from the loan list (${formatMoney(figures.principal)})`,
    oldValue: loan.status,
    newValue: null,
  });
}

// ========================================
// 5b. EDIT A LOAN
// ========================================
/**
 * Save a change to a loan from the Admin Panel.
 *
 * WHY THIS IS HAND-WRITTEN instead of using the generic engine:
 *   1. it records WHO changed it (updatedById + an audit line with the old and
 *      new value of every field that actually changed),
 *   2. the status is recalculated afterwards, because moving a deadline can turn
 *      a loan into an Overdue one straight away,
 *   3. the loan number and the status can never be typed over by a form.
 */
export async function updateLoan(
  id: string,
  data: Record<string, unknown>,
  actor: { id: string; name: string },
): Promise<Record<string, unknown>> {
  const before = await loadLoan(id);

  // Only the fields that were actually sent are changed, so a small edit never
  // wipes out everything else on the record.
  const updatable: Record<string, { column: string; kind: 'text' | 'date' | 'int' | 'bool' }> = {
    principalAmount: { column: 'principalAmount', kind: 'int' },
    interestAmount: { column: 'interestAmount', kind: 'int' },
    currency: { column: 'currency', kind: 'text' },
    requestedDate: { column: 'requestedDate', kind: 'date' },
    givenDate: { column: 'givenDate', kind: 'date' },
    disbursedDate: { column: 'disbursedDate', kind: 'date' },
    expectedReturnDate: { column: 'expectedReturnDate', kind: 'date' },
    purpose: { column: 'purpose', kind: 'text' },
    agreementNote: { column: 'agreementNote', kind: 'text' },
    installments: { column: 'installments', kind: 'int' },
    agreementSigned: { column: 'agreementSigned', kind: 'bool' },
    agreementNo: { column: 'agreementNo', kind: 'text' },
    agreementDate: { column: 'agreementDate', kind: 'date' },
    agreementStatus: { column: 'agreementStatus', kind: 'text' },
    agreementUrl: { column: 'agreementUrl', kind: 'text' },
    supportingUrl: { column: 'supportingUrl', kind: 'text' },
    notes: { column: 'notes', kind: 'text' },
    memberId: { column: 'memberId', kind: 'text' },
  };

  const changes: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const [field, rule] of Object.entries(updatable)) {
    if (data[field] === undefined) continue;

    const raw = data[field];
    let value: unknown;

    if (rule.kind === 'date') value = (raw as Date) ?? null;
    else if (rule.kind === 'int') value = raw === null || raw === '' ? 0 : Math.round(Number(raw));
    else if (rule.kind === 'bool') value = Boolean(raw);
    else value = raw === '' ? null : raw;

    const beforeValue = (before as unknown as Record<string, unknown>)[rule.column];

    // Only count it as a change when it really is different.
    const same =
      rule.kind === 'date'
        ? String(beforeValue ?? '') === String(value ?? '')
        : String(beforeValue ?? '') === String(value ?? '');

    if (same) continue;

    changes[rule.column] = value;
    changedFields.push(`${field}: ${String(beforeValue ?? '-')} -> ${String(value ?? '-')}`);
  }

  if (Object.keys(changes).length === 0) {
    // Nothing to save. Saying so is friendlier than "saved" when nothing moved.
    throw new UserFacingError('There was nothing new to save.');
  }

  if (changes.principalAmount !== undefined) {
    const principal = Number(changes.principalAmount);
    if (!Number.isFinite(principal) || principal <= 0) {
      throw new UserFacingError('The loan amount must be more than zero.', 422);
    }
  }

  // A member change must point at a real account.
  if (changes.memberId !== undefined) {
    const member = await prisma.user.findUnique({
      where: { id: String(changes.memberId) },
      select: { id: true },
    });
    if (!member) throw new UserFacingError('That member account was not found.', 422);
  }

  const figures = loanFigures(before);

  // Never allow an edit that would make the loan smaller than what has already
  // been repaid - the remaining balance would go negative.
  if (figures.returned > 0) {
    const principal = Number(changes.principalAmount ?? before.principalAmount);
    const interest = Number(changes.interestAmount ?? before.interestAmount ?? 0);
    if (principal + interest < figures.returned) {
      throw new UserFacingError(
        `${formatMoney(figures.returned)} has already been repaid, so the loan total cannot be set below that.`,
      );
    }
  }

  // A changed member is written as a relation too (see createLoan above).
  if (changes.memberId !== undefined) {
    changes.member = { connect: { id: String(changes.memberId) } };
    delete changes.memberId;
  }

  const updated = await prisma.loan.update({
    where: { id },
    data: { ...changes, updatedById: actor.id },
  });

  await writeLoanAudit({
    actorId: actor.id,
    actorName: actor.name,
    loanId: before.id,
    loanNo: before.loanNo,
    detail: `edited (${changedFields.length} change${changedFields.length === 1 ? '' : 's'})`,
    oldValue: changedFields.join(' | ').slice(0, 900),
    newValue: 'saved',
  });

  // A new deadline may make the loan overdue immediately.
  await recalculateLoan(id);

  return updated as unknown as Record<string, unknown>;
}

// ========================================
// 5c. KEEP EVERY LOAN STATUS UP TO DATE
// ========================================
/**
 * Recalculate the status of every loan that is not finished yet.
 *
 * WHY THIS IS NEEDED
 *   "Overdue" depends on the passage of time, and nothing happens at midnight
 *   to tell the database about it. Without this, a loan would quietly keep
 *   saying "Disbursed" until somebody happened to open its own page. Running
 *   this when the loan screens are opened means the office always sees the
 *   truth, and the member receives the "your repayment is overdue" message too.
 *
 * Loans that can no longer change (rejected, cancelled, completed in a final
 * way) are not touched.
 */
export async function refreshLoanStatuses(limit = 500): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    const loans = await prisma.loan.findMany({
      where: {
        isDeleted: false,
        status: {
          in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      select: { id: true },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });

    for (const loan of loans) {
      await recalculateLoan(loan.id);
    }

    return loans.length;
  } catch (error) {
    console.error('[loan] could not refresh the loan statuses:', error);
    return 0;
  }
}

// ========================================
// 6. MEMBER'S OWN LOANS (Member Panel)
// ========================================
/**
 * The loans of ONE member, with everything worked out.
 *
 * The memberId is passed in from the session, never from the address bar, so a
 * member can only ever see their own loans.
 */
export async function getMemberLoans(memberId: string) {
  if (!isDatabaseConfigured()) return { loans: [], totals: null };

  const loans = await prisma.loan.findMany({
    where: { memberId, isDeleted: false },
    include: { returns: { where: { isDeleted: false }, orderBy: { returnDate: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  // Keep every status honest at the moment the page is opened.
  for (const loan of loans) {
    await recalculateLoan(loan.id);
  }

  const withFigures = loans.map((loan) => ({
    ...loan,
    figures: loanFigures(loan),
    displayStatus: deriveLoanStatus(loan),
  }));

  return { loans: withFigures, totals: null };
}
