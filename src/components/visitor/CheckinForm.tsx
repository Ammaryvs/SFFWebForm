'use client';

import { useMemo, useState } from 'react';
import {
  CURRENT_CONSENT,
  PRIVACY_NOTICE_URL,
  ROLE_OPTIONS,
  phoneConsentAvailable,
  validateCheckin,
} from '@/domain/checkin';
import type { CheckinDetails, RoleId } from '@/domain/types';

/**
 * Check-in — spec §7.
 *
 * Five fields, two consent boxes, a notice block. The reference artwork
 * shows Name / Email / Phone / Address and no company field; it is wrong.
 * Address is dropped — it feeds no scoring, no routing and no follow-up, so
 * collecting it would fail purpose limitation. Company Name is required and
 * is not derivable from an email domain.
 *
 * Nothing credential-shaped is ever asked for: no password, account number,
 * NRIC, OTP or date of birth.
 */

const EMPTY: CheckinDetails = {
  fullName: '',
  companyName: '',
  companyEmail: '',
  role: 'manager_finance',
  phone: null,
  consentPurpose: false,
  consentPhone: false,
};

export function CheckinForm({
  onSubmit,
}: {
  onSubmit: (details: CheckinDetails) => void;
}) {
  const [details, setDetails] = useState<CheckinDetails>(EMPTY);
  const [touched, setTouched] = useState(false);

  const validation = useMemo(() => validateCheckin(details), [details]);
  const phoneAvailable = phoneConsentAvailable(details.phone);

  // Errors appear on the first submit attempt, not while typing: a form
  // that scolds a visitor mid-word is worse than one that waits.
  const errors = touched ? validation.errors : {};

  function set<K extends keyof CheckinDetails>(
    key: K,
    value: CheckinDetails[K],
  ) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (validation.canSubmit) onSubmit(details);
  }

  return (
    <div className="chrome">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <h1 className="form__title">Before we start</h1>

        <Field
          id="fullName"
          label="Full name"
          value={details.fullName}
          error={errors.fullName}
          autoComplete="name"
          onChange={(value) => set('fullName', value)}
        />

        <Field
          id="companyName"
          label="Company name"
          value={details.companyName}
          error={errors.companyName}
          autoComplete="organization"
          onChange={(value) => set('companyName', value)}
        />

        <Field
          id="companyEmail"
          label="Company email"
          type="email"
          inputMode="email"
          value={details.companyEmail}
          error={errors.companyEmail}
          autoComplete="email"
          onChange={(value) => set('companyEmail', value)}
        />

        <div className="field">
          <label className="field__label" htmlFor="role">
            Your role
          </label>
          <select
            id="role"
            className="field__control"
            value={details.role}
            onChange={(event) => set('role', event.target.value as RoleId)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Field
          id="phone"
          label="Phone"
          hint=" (optional)"
          type="tel"
          inputMode="tel"
          value={details.phone ?? ''}
          autoComplete="tel"
          onChange={(value) => {
            const next = value.trim() === '' ? null : value;
            setDetails((current) => ({
              ...current,
              phone: next,
              // Clearing the number withdraws the call consent with it.
              consentPhone: next === null ? false : current.consentPhone,
            }));
          }}
        />

        {/* Consent gates the write. Submit stays disabled until the first
            box is ticked; no unconsented personal data ever leaves the
            device. */}
        <label className="consent" htmlFor="consentPurpose">
          <input
            id="consentPurpose"
            type="checkbox"
            checked={details.consentPurpose}
            onChange={(event) => set('consentPurpose', event.target.checked)}
            aria-describedby={
              errors.consentPurpose ? 'consentPurpose-error' : undefined
            }
          />
          <span>{CURRENT_CONSENT.purpose_text}</span>
        </label>
        {errors.consentPurpose ? (
          <span className="field__error" id="consentPurpose-error" role="alert">
            {errors.consentPurpose}
          </span>
        ) : null}

        {/* PDPA Part 9: a Singapore number may not be called or SMSed for
            marketing without clear and unambiguous consent in evidential
            form. Enabled only once a number is entered. */}
        <label
          className={phoneAvailable ? 'consent' : 'consent consent--disabled'}
          htmlFor="consentPhone"
        >
          <input
            id="consentPhone"
            type="checkbox"
            checked={details.consentPhone}
            disabled={!phoneAvailable}
            onChange={(event) => set('consentPhone', event.target.checked)}
          />
          <span>{CURRENT_CONSENT.phone_text}</span>
        </label>

        <p className="notice">
          {CURRENT_CONSENT.notice_text}{' '}
          <a href={PRIVACY_NOTICE_URL} target="_blank" rel="noreferrer">
            Privacy notice
          </a>
        </p>

        <div className="actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!validation.canSubmit}
          >
            Start
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  error,
  type = 'text',
  inputMode,
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  error?: string;
  type?: string;
  inputMode?: 'email' | 'tel' | 'text';
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {hint ? <span className="field__hint">{hint}</span> : null}
      </label>
      <input
        id={id}
        className="field__control"
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
