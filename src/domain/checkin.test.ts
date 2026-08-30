import { describe, expect, it } from 'vitest';
import {
  CONSENT_VERSION,
  CURRENT_CONSENT,
  PRIVACY_NOTICE_URL,
  ROLE_OPTIONS,
  VALIDATION_MESSAGES,
  phoneConsentAvailable,
  validateCheckin,
} from './checkin';
import type { CheckinDetails } from './types';

const valid: CheckinDetails = {
  fullName: 'Ammar Yusri',
  companyName: 'ABC Pte Ltd',
  companyEmail: 'ammar@abc.com.sg',
  role: 'manager_finance',
  phone: null,
  consentPurpose: true,
  consentPhone: false,
};

describe('the check-in fields (spec §7)', () => {
  it('offers the three role tiers that are also the scoring tiers', () => {
    expect(ROLE_OPTIONS.map((o) => o.id)).toEqual([
      'owner_c_suite_director',
      'manager_finance',
      'executive_analyst_other',
    ]);
  });

  it('collects no address field', () => {
    // The reference artwork shows one. It feeds no scoring, no routing and
    // no follow-up, so collecting it fails purpose limitation.
    expect(Object.keys(valid)).not.toContain('address');
  });

  it('asks for nothing credential-shaped', () => {
    const fields = Object.keys(valid).join(' ').toLowerCase();
    for (const forbidden of [
      'password',
      'account',
      'nric',
      'otp',
      'birth',
      'passport',
    ]) {
      expect(fields).not.toContain(forbidden);
    }
  });
});

describe('check-in validation (spec §7)', () => {
  it('accepts a complete, consented check-in', () => {
    const result = validateCheckin(valid);
    expect(result.errors).toEqual({});
    expect(result.canSubmit).toBe(true);
  });

  it('requires a name and a company', () => {
    expect(validateCheckin({ ...valid, fullName: '  ' }).errors.fullName).toBe(
      VALIDATION_MESSAGES.fullName,
    );
    expect(
      validateCheckin({ ...valid, companyName: '' }).errors.companyName,
    ).toBe(VALIDATION_MESSAGES.companyName);
  });

  it('rejects an address that is not email-shaped', () => {
    for (const bad of ['', 'ammar', 'ammar@', '@abc.com', 'ammar abc.com']) {
      expect(
        validateCheckin({ ...valid, companyEmail: bad }).errors.companyEmail,
        `"${bad}" should be rejected`,
      ).toBe(VALIDATION_MESSAGES.companyEmail);
    }
  });

  it('never rejects a free-mail address', () => {
    // Blocking it would turn a scoring signal into a barrier.
    const result = validateCheckin({
      ...valid,
      companyEmail: 'someone@gmail.com',
    });
    expect(result.errors).toEqual({});
    expect(result.canSubmit).toBe(true);
  });
});

describe('consent gates the write (spec §7)', () => {
  it('blocks submit until the purpose box is ticked', () => {
    const result = validateCheckin({ ...valid, consentPurpose: false });
    expect(result.canSubmit).toBe(false);
    expect(result.errors.consentPurpose).toBe(
      VALIDATION_MESSAGES.consentPurpose,
    );
  });

  it('blocks submit while any field is invalid, consent or not', () => {
    expect(validateCheckin({ ...valid, fullName: '' }).canSubmit).toBe(false);
  });

  it('enables the phone box only once a number is entered', () => {
    expect(phoneConsentAvailable(null)).toBe(false);
    expect(phoneConsentAvailable('')).toBe(false);
    expect(phoneConsentAvailable('   ')).toBe(false);
    expect(phoneConsentAvailable('+65 9123 4567')).toBe(true);
  });

  it('refuses a phone consent with no phone number', () => {
    const result = validateCheckin({
      ...valid,
      phone: null,
      consentPhone: true,
    });
    expect(result.canSubmit).toBe(false);
    expect(result.errors.consentPhone).toBeDefined();
  });

  it('allows a phone with no phone consent — the number is simply not callable', () => {
    const result = validateCheckin({
      ...valid,
      phone: '+65 9123 4567',
      consentPhone: false,
    });
    expect(result.canSubmit).toBe(true);
  });
});

describe('the consent record (spec §7, §10)', () => {
  it('pins the exact wording shown, under a version', () => {
    expect(CURRENT_CONSENT.version).toBe(CONSENT_VERSION);
    expect(CURRENT_CONSENT.purpose_text).toContain(
      'contact me about the solutions we discuss here today',
    );
    expect(CURRENT_CONSENT.phone_text).toContain('call or SMS');
    expect(CURRENT_CONSENT.notice_text).toContain('90 days');
    expect(CURRENT_CONSENT.notice_text).toContain(
      'dataprotectionofficer@uobgroup.com',
    );
  });

  it('scopes consent to follow-up on this conversation, not marketing', () => {
    expect(CURRENT_CONSENT.purpose_text.toLowerCase()).not.toContain(
      'marketing',
    );
  });

  it('links the privacy notice', () => {
    expect(PRIVACY_NOTICE_URL).toBe(
      'https://www.uob.com.sg/assets/web-resources/uobgroup/pdf/privacy/uob-privacy-corporate.pdf',
    );
  });
});
