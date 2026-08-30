/**
 * Check-in, consent and the PDPA position — spec §7.
 *
 * The consent wording lives here once and is versioned. Editing it means
 * inserting a **new** version row in `consent_versions`, never updating the
 * existing one: an update destroys the evidence retroactively, and PDPA
 * requires consent in evidential form.
 */

import type { CheckinDetails, ConsentVersionRecord, RoleId } from './types';

export const PRIVACY_NOTICE_URL =
  'https://www.uob.com.sg/assets/web-resources/uobgroup/pdf/privacy/uob-privacy-corporate.pdf';

export const DPO_EMAIL = 'dataprotectionofficer@uobgroup.com';

/** Bump — never edit in place — when any wording below changes. */
export const CONSENT_VERSION = '2026-08-31.v1';

/**
 * The exact strings shown at check-in. Stored once here rather than on all
 * 2,000 lead rows; the lead carries version + timestamp + booleans.
 */
export const CURRENT_CONSENT: ConsentVersionRecord = {
  version: CONSENT_VERSION,
  purpose_text:
    'I agree that UOB may contact me about the solutions we discuss here today.',
  phone_text:
    'UOB may call or SMS me on this number about those solutions.',
  notice_text:
    'United Overseas Bank Limited collects your name, company email and role ' +
    'to follow up on this conversation. We keep it for 90 days, then delete ' +
    `it. To withdraw, speak to our booth staff or contact ${DPO_EMAIL}.`,
  effective_from: '2026-08-31T00:00:00.000Z',
};

/** The dropdown options — these *are* the decision-influence tiers (§8). */
export const ROLE_OPTIONS: readonly { id: RoleId; label: string }[] = [
  { id: 'owner_c_suite_director', label: 'Owner, C-suite or Director' },
  { id: 'manager_finance', label: 'Manager or finance role' },
  { id: 'executive_analyst_other', label: 'Executive, analyst or other' },
];

export function roleLabel(role: RoleId): string {
  return ROLE_OPTIONS.find((option) => option.id === role)?.label ?? role;
}

export const VALIDATION_MESSAGES = {
  fullName: 'Please enter your name.',
  companyName: 'Please enter your company.',
  companyEmail: "That email doesn't look right.",
  consentPurpose: 'Please tick the box to continue.',
  consentPhone: 'Enter a phone number first.',
} as const;

export type CheckinField = keyof typeof VALIDATION_MESSAGES;

export interface CheckinValidation {
  readonly errors: Partial<Record<CheckinField, string>>;
  /**
   * Submit stays disabled until this is true. No unconsented personal data
   * ever leaves the device.
   */
  readonly canSubmit: boolean;
}

/**
 * Deliberately loose: one `@`, something either side, a dot in the domain.
 * A free-mail address is valid — it scores zero on company fit, which is a
 * scoring signal, not a barrier.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** The second box is enabled only once a number has been entered. */
export function phoneConsentAvailable(phone: string | null): boolean {
  return (phone ?? '').trim().length > 0;
}

export function validateCheckin(details: CheckinDetails): CheckinValidation {
  const errors: Partial<Record<CheckinField, string>> = {};

  if (details.fullName.trim() === '') {
    errors.fullName = VALIDATION_MESSAGES.fullName;
  }
  if (details.companyName.trim() === '') {
    errors.companyName = VALIDATION_MESSAGES.companyName;
  }
  if (!EMAIL_SHAPE.test(details.companyEmail.trim())) {
    errors.companyEmail = VALIDATION_MESSAGES.companyEmail;
  }
  if (!details.consentPurpose) {
    errors.consentPurpose = VALIDATION_MESSAGES.consentPurpose;
  }
  // A phone consent with no number is not a consent to anything, and would
  // put an empty cell in the export's Phone column either way.
  if (details.consentPhone && !phoneConsentAvailable(details.phone)) {
    errors.consentPhone = VALIDATION_MESSAGES.consentPhone;
  }

  return { errors, canSubmit: Object.keys(errors).length === 0 };
}
