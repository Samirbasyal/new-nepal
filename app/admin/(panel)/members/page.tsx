// ========================================
// ADMIN PANEL
// This code controls the Members manager.
// ========================================
// Address: /admin/members
//
// WHAT YOU CAN DO HERE
//   - create a member account (this is the ONLY way an account is created -
//     members cannot register themselves)
//   - type a starting password, or press "Generate a password" and hand it over
//   - send the verification email straight away (a switch on the form)
//   - edit a member: name, email, phone, role, membership details, address
//   - activate / deactivate an account
//   - switch "Show on public Members page" on or off
//   - search by name, email, phone, district or membership number
//   - filter by membership status or role
//
// WHAT HAPPENS WHEN YOU SAVE A NEW MEMBER
//   1. The account is created with the role you chose (default MEMBER).
//   2. The password is hashed with bcrypt on the server - never stored as typed.
//   3. A REAL verification email is sent (see lib/auth/verification.ts).
//      The member cannot open the member panel until the address is verified.
//   4. Every other administrator gets a notification about the new member.
//
// IF THE EMAIL IS NOT CONFIGURED YET
//   The account is still created and the page tells you plainly that no email
//   went out. The link is printed in the server terminal so you can finish the
//   flow locally. See "Email" in PROJECT_GUIDE.md.
//
// SAFETY RULES BUILT INTO THE SERVER (see lib/api/resources.ts)
//   - you cannot change your own role
//   - you cannot delete or deactivate your own account
//   - you cannot remove the last administrator account
//
// PRIVACY
//   Email addresses, phone numbers, addresses and membership numbers are NEVER
//   shown on the public website.
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { MEMBERSHIP_STATUS_OPTIONS, ROLE_OPTIONS } from '@/lib/constants';
import { DISTRICT_OPTIONS } from '@/config/districts';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Members',
  robots: { index: false, follow: false },
};

const COLUMNS: ColumnConfig[] = [
  // The name opens that member's money history: their monthly fund, their loans
  // and any donation given with the same email address, each kept separate.
  {
    name: 'name',
    label: 'Name',
    type: 'link',
    hrefTemplate: '/admin/member-history?memberId={id}',
  },
  { name: 'email', label: 'Email', hideOnMobile: true },
  { name: 'role', label: 'Role', type: 'badge' },
  { name: 'district', label: 'District', hideOnMobile: true },
  { name: 'status', label: 'Status', type: 'badge' },
  // Empty means "not verified yet". Only verified members can sign in.
  { name: 'emailVerifiedAt', label: 'Email verified', type: 'date', hideOnMobile: true },
  { name: 'isActive', label: 'Active', type: 'boolean' },
  { name: 'isPublic', label: 'Listed publicly', type: 'boolean' },
];

const FIELDS: FieldConfig[] = [
  // ---------- Account ----------
  { name: 'name', label: 'Full name', type: 'text', required: true, section: 'Account' },
  {
    name: 'email',
    label: 'Email address',
    type: 'email',
    required: true,
    hint: 'Used to sign in, and the address the verification email is sent to.',
    section: 'Account',
  },
  {
    name: 'password',
    label: 'Starting password',
    type: 'password',
    generatePassword: true,
    hint: 'Press "Generate a password" or type one (at least 8 characters). When editing, leave empty to keep the current password.',
    section: 'Account',
  },
  {
    name: 'sendVerificationEmail',
    label: 'Email the member a verification link now',
    type: 'checkbox',
    hint: 'The member cannot sign in until the address is verified. Only used for the Member role, and only when adding somebody new.',
    section: 'Account',
  },
  { name: 'phone', label: 'Phone number', type: 'text', hint: 'Never shown publicly.', section: 'Account' },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    options: ROLE_OPTIONS,
    hint: 'Administrator = can open this Admin Panel. Member = member panel only.',
    section: 'Account',
  },
  {
    name: 'isActive',
    label: 'Account is active',
    type: 'checkbox',
    hint: 'Switch off to block sign-in without deleting the account.',
    section: 'Account',
  },

  // ---------- Membership ----------
  { name: 'membershipNo', label: 'Membership number', type: 'text', hint: 'Never shown publicly.', section: 'Membership' },
  { name: 'designation', label: 'Designation', type: 'text', placeholder: 'For example: Chairperson, Secretary, Volunteer', section: 'Membership' },
  { name: 'department', label: 'Department / area', type: 'text', placeholder: 'For example: Education, Health', section: 'Membership' },
  { name: 'status', label: 'Membership status', type: 'select', options: MEMBERSHIP_STATUS_OPTIONS, hint: 'Only ACTIVE members are counted in the expected monthly collection.', section: 'Membership' },
  { name: 'joinedAt', label: 'Member since', type: 'date', section: 'Membership' },

  // ---------- Address ----------
  // These three are what the district reports count, so they are kept separate
  // from the free-text address.
  { name: 'district', label: 'District', type: 'select', options: DISTRICT_OPTIONS, section: 'Address' },
  { name: 'municipality', label: 'Municipality / Rural municipality', type: 'text', section: 'Address' },
  { name: 'ward', label: 'Ward', type: 'text', hint: 'For example: 5', section: 'Address' },
  { name: 'address', label: 'Full address', type: 'text', hint: 'Private. Kept for the organization\'s own records.', section: 'Address' },

  // ---------- Public profile ----------
  { name: 'bio', label: 'Short introduction', type: 'textarea', hint: 'Only shown publicly when the switch below is on.', section: 'Public profile' },
  { name: 'photoUrl', label: 'Photo', type: 'image', uploadable: true, section: 'Public profile' },
  {
    name: 'isPublic',
    label: 'Show on the public Members page',
    type: 'checkbox',
    hint: 'Only switch this on with the member\'s agreement.',
    section: 'Public profile',
  },
];

export default function AdminMembersPage() {
  return (
    <ResourceManager
      resourceKey="members"
      entityLabel="Member"
      title="Members"
      description="Member and administrator accounts. New members are created here and sent a real verification email. Passwords are hashed on the server and can never be read back."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={MEMBERSHIP_STATUS_OPTIONS}
      statusField="status"
      defaults={{
        role: 'MEMBER',
        status: 'PENDING',
        isActive: true,
        isPublic: false,
        sendVerificationEmail: true,
      }}
    />
  );
}
