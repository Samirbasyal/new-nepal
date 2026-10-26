// ========================================
// ADMIN PANEL - SHARED FIELD DESCRIPTIONS
// ========================================
// Every Admin Panel page describes its form by writing a small list of fields.
// These types define what can be put in that list.
//
// EXAMPLE (taken from app/admin/(panel)/programs/page.tsx)
//
//   const FIELDS: FieldConfig[] = [
//     { name: 'title', label: 'Program title', type: 'text', required: true },
//     { name: 'description', label: 'Full details', type: 'textarea' },
//     { name: 'isPublished', label: 'Published', type: 'checkbox' },
//   ];
//
// The ResourceManager then builds the table and the edit form automatically.
// ========================================

export type FieldType =
  | 'text'
  | 'email'
  | 'url'
  | 'password'
  | 'textarea'
  /** A textarea where each line becomes one bullet point. */
  | 'lines'
  | 'number'
  | 'date'
  /**
   * A date chosen from a Bikram Sambat calendar. The value stays a Gregorian
   * YYYY-MM-DD string - the same as 'date' - so nothing downstream changes.
   */
  | 'nepali-date'
  | 'datetime'
  | 'checkbox'
  | 'select'
  /**
   * A visible choice between named states, such as Private / Public.
   *
   * When the options are "true" and "false" the stored value is still a boolean,
   * so a radio group can drive a real switch without any change to the API or
   * the database.
   */
  | 'radio'
  /** An image address, with a preview and an upload button. */
  | 'image';

export type FieldConfig = {
  /** Must match the column name in prisma/schema.prisma */
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** For type "select": the list of choices. */
  options?: { value: string; label: string }[];
  /** For type "image": show an upload button (needs a writable disk). */
  uploadable?: boolean;
  /**
   * For type "password": show a "Generate a password" button next to the box.
   * The generated value appears in the field, so the administrator can write it
   * down and hand it over before saving. Used when adding a member.
   */
  generatePassword?: boolean;
  /** How much of the form width the field uses (out of 2 columns). */
  span?: 1 | 2;
  /** Only show this field when another field has one of these values. */
  showWhen?: { field: string; values: string[] };
  /**
   * Fill this field from another field's choice, when it is still empty.
   * Used for "choosing a saved position suggests that position's standard
   * responsibility". It never overwrites text the administrator typed.
   */
  deriveFrom?: { field: string; map: Record<string, string> };
  /** Group fields into boxes with a heading. */
  section?: string;
};

export type ColumnType =
  | 'text'
  | 'longtext'
  | 'badge'
  | 'boolean'
  | 'date'
  /** Shown in both calendars: "05 Mar 2019 - 21 Magh 2075". */
  | 'nepali-date'
  | 'datetime'
  | 'image'
  | 'number'
  | 'link'
  | 'money';

export type ColumnConfig = {
  name: string;
  label: string;
  type?: ColumnType;
  /**
   * Show a click-to-toggle switch instead of a plain value.
   * Used for "Published" and "Shown publicly".
   */
  toggle?: boolean;
  /** Hide this column on small screens (it is always available in the form). */
  hideOnMobile?: boolean;
  /**
   * For type "link": the page this value opens. Use {id} for the row's own id.
   *
   * Example (a loan number that opens the loan's full record):
   *   { name: 'loanNo', label: 'Loan', type: 'link', hrefTemplate: '/admin/loans/{id}' }
   */
  hrefTemplate?: string;
};

// ========================================
// WHAT THE API RETURNS
// ========================================
export type AdminRow = Record<string, unknown>;

export type AdminListResponse = {
  ok: true;
  data: {
    rows: AdminRow[];
    total: number;
    page: number;
    pageSize: number;
  };
};

export type AdminErrorResponse = {
  ok: false;
  error: string;
  fields?: Record<string, string>;
};
