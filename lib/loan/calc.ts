// ========================================
// LOAN MANAGEMENT - ALL THE ARITHMETIC
// ========================================
// THIS IS THE ONLY PLACE WHERE LOAN MONEY IS WORKED OUT.
//
// Nothing in this file reads or writes the monthly member fund. Loan money and
// fund money are different kinds of money, and mixing them would make both
// reports wrong. The two only meet inside the reports of the master dashboard,
// where they are shown side by side and never added together.
//
// THE ONE RULE THAT MATTERS MOST
//   A LOAN BALANCE IS NEVER TYPED IN AND NEVER STORED.
//   It is always:
//        payable   = principal + interest
//        returned  = SUM of the repayment rows that are not deleted
//        remaining = payable - returned
//   So the number on the screen can always be rebuilt from the history, and no
//   stored total can ever drift away from the records it came from.
// ========================================

import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/fund/calc';

// ========================================
// MONEY HELPERS
// ========================================
/** What the member has to pay back in total. */
export function loanPayable(principal: number, interest = 0): number {
  return Math.max(0, Math.round(principal)) + Math.max(0, Math.round(interest));
}

/** A repayment row as this file needs to see it. */
export type ReturnLike = {
  amount: number;
  isDeleted?: boolean | null;
  returnDate?: Date | string | null;
};

/** Add up the repayments, ignoring any that were removed. */
export function sumReturns(returns: ReturnLike[] | null | undefined): number {
  if (!returns || returns.length === 0) return 0;

  return returns
    .filter((row) => !row.isDeleted)
    .reduce((total, row) => total + (Number.isFinite(row.amount) ? Math.round(row.amount) : 0), 0);
}

export type LoanFigures = {
  principal: number;
  interest: number;
  /** principal + interest */
  payable: number;
  /** how much has come back */
  returned: number;
  /** what is still owed (never below zero) */
  remaining: number;
  /** 0 - 100, how much of the payable amount has come back */
  repaidPercent: number;
  /** how many repayments were recorded */
  returnCount: number;
};

/**
 * Every number the loan screens need, from one loan record.
 *
 * `loan` may be a Prisma row that includes its `returns`.
 */
export function loanFigures(loan: {
  principalAmount: number;
  interestAmount?: number | null;
  returns?: ReturnLike[] | null;
}): LoanFigures {
  const principal = Math.max(0, Math.round(loan.principalAmount ?? 0));
  const interest = Math.max(0, Math.round(loan.interestAmount ?? 0));
  const payable = loanPayable(principal, interest);
  const returned = sumReturns(loan.returns);
  const remaining = Math.max(0, payable - returned);

  const repaidPercent = payable === 0 ? 0 : Math.min(100, Math.round((returned / payable) * 100));

  return {
    principal,
    interest,
    payable,
    returned,
    remaining,
    repaidPercent,
    returnCount: (loan.returns ?? []).filter((row) => !row.isDeleted).length,
  };
}

// ========================================
// WHAT IS THE LOAN'S REAL STATUS?
// ========================================
/**
 * Work out the correct status from the records.
 *
 * REJECTED and CANCELLED are final: once a loan is refused or cancelled it
 * stays that way and this function leaves it alone.
 *
 * Everything else follows the money:
 *   money not given out yet  -> PENDING / UNDER_REVIEW / APPROVED (as set by the office)
 *   money given out          -> COMPLETED when fully repaid
 *                               PARTIALLY_PAID once something has come back
 *                               OVERDUE when the deadline has passed
 *                               DISBURSED otherwise
 */
export function deriveLoanStatus(loan: {
  status: string;
  principalAmount: number;
  interestAmount?: number | null;
  disbursedDate?: Date | string | null;
  givenDate?: Date | string | null;
  expectedReturnDate?: Date | string | null;
  returns?: ReturnLike[] | null;
}): string {
  const current = String(loan.status ?? 'PENDING').toUpperCase();

  // Final states are never overwritten.
  if (current === 'REJECTED' || current === 'CANCELLED') return current;

  // Has the money actually been given to the member?
  //
  // APPROVED is included on purpose: if the office filled in the hand-over date
  // in the form (the normal way when the loan already happened), the status
  // follows the record by itself. A loan that is still PENDING is NOT moved on,
  // so nobody can skip the approval step by typing a date.
  const moneyOut = Boolean(loan.disbursedDate || loan.givenDate) &&
    ['APPROVED', 'DISBURSED', 'PARTIALLY_PAID', 'OVERDUE', 'COMPLETED'].includes(current);

  if (!moneyOut) {
    // Still before the money changed hands. Only these three are possible.
    if (current === 'UNDER_REVIEW') return 'UNDER_REVIEW';
    if (current === 'APPROVED') return 'APPROVED';
    return 'PENDING';
  }

  const figures = loanFigures(loan);

  if (figures.payable > 0 && figures.remaining === 0) return 'COMPLETED';
  if (figures.returned > 0) {
    // Something came back, but the deadline may still have passed.
    const deadline = loan.expectedReturnDate ? new Date(loan.expectedReturnDate) : null;
    const late = deadline ? startOfDay(deadline).getTime() < startOfDay(new Date()).getTime() : false;
    return late ? 'OVERDUE' : 'PARTIALLY_PAID';
  }

  const deadline = loan.expectedReturnDate ? new Date(loan.expectedReturnDate) : null;
  const overdue = deadline ? startOfDay(deadline).getTime() < startOfDay(new Date()).getTime() : false;

  return overdue ? 'OVERDUE' : 'DISBURSED';
}

// ========================================
// THE LOAN DASHBOARD NUMBERS
// ========================================
export type LoanTotals = {
  totalLoans: number;
  /** How many different members have borrowed. */
  borrowingMembers: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayable: number;
  totalRepaid: number;
  totalOutstanding: number;
  pendingLoans: number;
  approvedLoans: number;
  activeLoans: number;
  partiallyPaidLoans: number;
  overdueLoans: number;
  completedLoans: number;
  rejectedLoans: number;
  cancelledLoans: number;
  /** Every repayment ever recorded. */
  totalReturns: number;
  /** How much of the payable amount has come back, across all loans. */
  repaidPercent: number;
};

const EMPTY_TOTALS: LoanTotals = {
  totalLoans: 0,
  borrowingMembers: 0,
  totalPrincipal: 0,
  totalInterest: 0,
  totalPayable: 0,
  totalRepaid: 0,
  totalOutstanding: 0,
  pendingLoans: 0,
  approvedLoans: 0,
  activeLoans: 0,
  partiallyPaidLoans: 0,
  overdueLoans: 0,
  completedLoans: 0,
  rejectedLoans: 0,
  cancelledLoans: 0,
  totalReturns: 0,
  repaidPercent: 0,
};

/**
 * Every number on the Loan dashboard.
 *
 * `where` lets a caller narrow it down (one member, one year, one district...).
 * The figures are worked out from the rows that are actually in the database,
 * never from a stored total.
 */
export async function getLoanTotals(where: Record<string, unknown> = {}): Promise<LoanTotals> {
  if (!isDatabaseConfigured()) return EMPTY_TOTALS;

  try {
    const loans = await prisma.loan.findMany({
      where: { isDeleted: false, ...where },
      select: {
        id: true,
        memberId: true,
        status: true,
        principalAmount: true,
        interestAmount: true,
        givenDate: true,
        disbursedDate: true,
        expectedReturnDate: true,
        returns: { select: { amount: true, isDeleted: true, returnDate: true } },
      },
    });

    const totals: LoanTotals = { ...EMPTY_TOTALS };
    const members = new Set<string>();

    for (const loan of loans) {
      const figures = loanFigures(loan);
      const status = deriveLoanStatus(loan);

      totals.totalLoans += 1;
      members.add(loan.memberId);

      totals.totalPrincipal += figures.principal;
      totals.totalInterest += figures.interest;
      totals.totalPayable += figures.payable;
      totals.totalRepaid += figures.returned;
      totals.totalOutstanding += figures.remaining;
      totals.totalReturns += figures.returnCount;

      if (status === 'PENDING' || status === 'UNDER_REVIEW') totals.pendingLoans += 1;
      else if (status === 'APPROVED') totals.approvedLoans += 1;
      else if (status === 'DISBURSED') totals.activeLoans += 1;
      else if (status === 'PARTIALLY_PAID') totals.partiallyPaidLoans += 1;
      else if (status === 'OVERDUE') totals.overdueLoans += 1;
      else if (status === 'COMPLETED') totals.completedLoans += 1;
      else if (status === 'REJECTED') totals.rejectedLoans += 1;
      else if (status === 'CANCELLED') totals.cancelledLoans += 1;
    }

    totals.borrowingMembers = members.size;
    totals.repaidPercent =
      totals.totalPayable === 0
        ? 0
        : Math.min(100, Math.round((totals.totalRepaid / totals.totalPayable) * 100));

    return totals;
  } catch (error) {
    console.error('[loan] could not work out the loan totals:', error);
    return EMPTY_TOTALS;
  }
}

/** Loans that are past their deadline and still owe money (used for reminders). */
export async function findOverdueLoans(): Promise<
  { id: string; loanNo: string; memberId: string; remaining: number; expectedReturnDate: Date | null }[]
> {
  if (!isDatabaseConfigured()) return [];

  try {
    const loans = await prisma.loan.findMany({
      where: {
        isDeleted: false,
        status: { in: ['DISBURSED', 'PARTIALLY_PAID', 'OVERDUE'] },
        expectedReturnDate: { lt: new Date() },
      },
      select: {
        id: true,
        loanNo: true,
        memberId: true,
        principalAmount: true,
        interestAmount: true,
        expectedReturnDate: true,
        returns: { select: { amount: true, isDeleted: true } },
      },
    });

    return loans
      .map((loan) => ({
        id: loan.id,
        loanNo: loan.loanNo,
        memberId: loan.memberId,
        remaining: loanFigures(loan).remaining,
        expectedReturnDate: loan.expectedReturnDate,
      }))
      .filter((loan) => loan.remaining > 0);
  } catch {
    return [];
  }
}

// ========================================
// REPAYMENT HISTORY FOR ONE LOAN
// ========================================
// The running balance after each repayment, oldest first. This is what makes a
// statement readable: each line shows what was left after that payment.
export type RepaymentLine = {
  id: string;
  amount: number;
  returnDate: Date;
  method: string;
  referenceNumber: string | null;
  notes: string | null;
  proofUrl: string | null;
  /** What was still owed AFTER this repayment. */
  balanceAfter: number;
};

export function buildRepaymentHistory(loan: {
  principalAmount: number;
  interestAmount?: number | null;
  returns?: (ReturnLike & { id: string; method: string; referenceNumber?: string | null; notes?: string | null; proofUrl?: string | null })[];
}): RepaymentLine[] {
  const payable = loanPayable(loan.principalAmount, loan.interestAmount ?? 0);

  const rows = (loan.returns ?? [])
    .filter((row) => !row.isDeleted)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.returnDate ?? 0).getTime() - new Date(b.returnDate ?? 0).getTime(),
    );

  let running = 0;

  return rows.map((row) => {
    running += Math.round(row.amount);
    return {
      id: row.id,
      amount: Math.round(row.amount),
      returnDate: new Date(row.returnDate ?? new Date()),
      method: row.method,
      referenceNumber: row.referenceNumber ?? null,
      notes: row.notes ?? null,
      proofUrl: row.proofUrl ?? null,
      balanceAfter: Math.max(0, payable - running),
    };
  });
}
