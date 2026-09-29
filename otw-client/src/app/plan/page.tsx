'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './plan.module.css';
import { createGala } from './mockCreate';
import { registerCreatedGala } from '@/lib/otw/gala-registry';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time (not UTC).
 */
function getLocalTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes "Ends on <Weekday, Mon D>" in local time from firstDay + numDays - 1.
 */
function computeEndsOn(firstDay: string, numDays: number): string | null {
  if (!firstDay || !numDays || numDays < 2 || numDays > 30) return null;
  const parts = firstDay.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  const end = new Date(y, m - 1, d + numDays - 1);
  return end.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function PlanPage() {
  const router = useRouter();

  // Multi-step state: 1 to 4
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [name, setName] = useState('');
  const [tripType, setTripType] = useState<'DAY_TOUR' | 'VACATION'>('DAY_TOUR');
  const [date, setDate] = useState('');
  const [daysInput, setDaysInput] = useState('3');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [destination, setDestination] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Error states per step
  const [errors, setErrors] = useState<{
    name?: string;
    date?: string;
    days?: string;
    startTime?: string;
    endTime?: string;
    time?: string;
    destination?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Input refs for auto-focusing on validation failure
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const daysInputRef = useRef<HTMLInputElement>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const endTimeInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  // Generated accessible IDs
  const nameId = useId();
  const tripTypeId = useId();
  const dateId = useId();
  const daysId = useId();
  const startTimeId = useId();
  const endTimeId = useId();
  const destinationId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const todayStr = getLocalTodayString();

  // Move focus to the new screen's <h1> when step changes
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // Compute password strength
  const getPasswordStrength = (pass: string): { label: 'Weak' | 'Good' | 'Strong'; level: 1 | 2 | 3 } => {
    if (!pass || pass.length < 6) {
      return { label: 'Weak', level: 1 };
    }
    const hasLettersAndNumbers = /[a-zA-Z]/.test(pass) && /[0-9]/.test(pass);
    if (pass.length >= 10 && hasLettersAndNumbers) {
      return { label: 'Strong', level: 3 };
    }
    return { label: 'Good', level: 2 };
  };

  const strength = getPasswordStrength(password);

  // Step 1: Use Example handler
  const handleUseExample = () => {
    setName('Baguio Before Graduation');
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  // Step 2: Vacation days +/- buttons
  const handleFewerDays = () => {
    const current = Number(daysInput) || 3;
    const nextVal = Math.max(2, current - 1);
    setDaysInput(String(nextVal));
    if (errors.days) setErrors((prev) => ({ ...prev, days: undefined }));
  };

  const handleMoreDays = () => {
    const current = Number(daysInput) || 1;
    const nextVal = Math.min(30, current + 1);
    setDaysInput(String(nextVal));
    if (errors.days) setErrors((prev) => ({ ...prev, days: undefined }));
  };

  const parsedDays = Number(daysInput);
  const endsOnText = tripType === 'VACATION' ? computeEndsOn(date, parsedDays) : null;

  // Step 3: Destination chip selection
  const destinationChips = ['Baguio City', 'Tagaytay', 'La Union', 'Batangas'];

  const handleChipClick = (chip: string) => {
    setDestination(chip);
    if (errors.destination) {
      setErrors((prev) => ({ ...prev, destination: undefined }));
    }
  };

  // Form submit handler: manages step progression and final submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (step === 1) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 40) {
        setErrors((prev) => ({
          ...prev,
          name: 'Give your gala a name (at least 2 characters).',
        }));
        nameInputRef.current?.focus();
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const newErrors: {
        date?: string;
        days?: string;
        startTime?: string;
        endTime?: string;
        time?: string;
      } = {};

      if (!date) {
        newErrors.date = 'Pick a date for the gala.';
      } else if (date < todayStr) {
        newErrors.date = 'That date already passed. Pick today or later.';
      }

      if (tripType === 'VACATION') {
        const d = Number(daysInput);
        if (!daysInput || isNaN(d) || !Number.isInteger(d) || d < 2 || d > 30) {
          newErrors.days = 'Enter how many days (2 to 30).';
        }
      }

      if (!startTime) {
        newErrors.startTime = 'Pick a start time.';
      }

      if (!endTime) {
        newErrors.endTime = 'Pick an end time.';
      } else if (startTime && endTime <= startTime) {
        newErrors.time = 'End time should be after the start time.';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...newErrors }));
        if (newErrors.date) {
          dateInputRef.current?.focus();
        } else if (newErrors.days) {
          daysInputRef.current?.focus();
        } else if (newErrors.startTime || newErrors.time) {
          startTimeInputRef.current?.focus();
        } else if (newErrors.endTime) {
          endTimeInputRef.current?.focus();
        }
        return;
      }

      setErrors({});
      setStep(3);
      return;
    }

    if (step === 3) {
      const trimmedDest = destination.trim();
      if (trimmedDest.length < 2) {
        setErrors((prev) => ({
          ...prev,
          destination: 'Pick a place or type where you are headed.',
        }));
        destinationInputRef.current?.focus();
        return;
      }
      setErrors({});
      setStep(4);
      return;
    }

    if (step === 4) {
      if (password.length < 6) {
        setErrors((prev) => ({
          ...prev,
          password: 'Use at least 6 characters.',
        }));
        passwordInputRef.current?.focus();
        return;
      }
      if (password !== confirmPassword) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: 'Passwords do not match.',
        }));
        confirmPasswordInputRef.current?.focus();
        return;
      }

      setErrors({});
      setIsSubmitting(true);

      try {
        const finalDays = tripType === 'DAY_TOUR' ? 1 : Number(daysInput) || 3;
        const result = await createGala({
          name: name.trim(),
          tripType,
          date,
          days: finalDays,
          startTime,
          endTime,
          destination: destination.trim(),
          password,
        });

        // Hand the created gala to the shared gala store; the creator is the Gala Leader.
        registerCreatedGala({
          code: result.code,
          title: name.trim(),
          date,
          days: finalDays,
          startTime,
          endTime,
          destination: destination.trim(),
          password,
        });

        // Save password to sessionStorage
        // TODO(D3-01): replace with real state
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('otw:gala-password', password);
        }

        router.push(`/code-confirm?code=${encodeURIComponent(result.code)}`);
      } catch {
        setIsSubmitting(false);
      }
    }
  };

  // Back button handler
  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  };

  // Step theme class
  const themeClass =
    step === 1
      ? styles.step1Theme
      : step === 2
      ? styles.step2Theme
      : step === 3
      ? styles.step3Theme
      : styles.step4Theme;

  return (
    <main className={`${styles.planPage} ${themeClass}`}>
      {/* 3 large floating background shapes (sparkle, ring, blob) */}
      <div className={styles.bgShapes} aria-hidden="true">
        {/* Sparkle */}
        <svg
          className={`${styles.floatingShape} ${styles.shapeSparkle}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
        </svg>

        {/* Ring outline */}
        <svg
          className={`${styles.floatingShape} ${styles.shapeRing}`}
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
        >
          <circle cx="50" cy="50" r="40" />
        </svg>

        {/* Organic Blob */}
        <svg
          className={`${styles.floatingShape} ${styles.shapeBlob}`}
          viewBox="0 0 100 100"
        >
          <path d="M52 4C78 2 98 22 96 50c-2 30-24 48-50 46C20 94 2 74 5 48 8 24 28 6 52 4Z" />
        </svg>
      </div>

      <div className={styles.contentContainer}>
        {/* Header on every screen: OTW wordmark top-left, round X top-right */}
        <header className={styles.header}>
          <Link href="/" className={styles.wordmarkLink} aria-label="OTW home">
            <svg
              className={styles.wordmarkPin}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className={styles.wordmarkText}>OTW</span>
          </Link>

          <Link href="/" className={styles.closeBtn} aria-label="Cancel and return home">
            <svg
              className={styles.closeIcon}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Link>
        </header>

        {/* Top of every step: 4 progress pills + text "Step N of 4" */}
        <div
          className={styles.progressRow}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-label={`Step ${step} of 4`}
        >
          <div className={styles.progressPills} aria-hidden="true">
            <span
              className={`${styles.progressPill} ${
                step >= 1 ? styles.pillFilled : styles.pillUnfilled
              }`}
            />
            <span
              className={`${styles.progressPill} ${
                step >= 2 ? styles.pillFilled : styles.pillUnfilled
              }`}
            />
            <span
              className={`${styles.progressPill} ${
                step >= 3 ? styles.pillFilled : styles.pillUnfilled
              }`}
            />
            <span
              className={`${styles.progressPill} ${
                step >= 4 ? styles.pillFilled : styles.pillUnfilled
              }`}
            />
          </div>
          <span className={styles.progressText}>Step {step} of 4</span>
        </div>

        {/* Step Form */}
        <form className={styles.stepForm} onSubmit={handleFormSubmit} noValidate>
          {/* ======================================================== */}
          {/* STEP 1: Gala Name (Rosy)                                 */}
          {/* ======================================================== */}
          {step === 1 && (
            <div className={styles.stepBody}>
              <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
                First things first. What are we calling this gala?
              </h1>
              <p className={styles.subCopy}>
                Give your gala a name your GC will remember.
              </p>

              <div className={styles.fieldGroup}>
                <label htmlFor={nameId} className={styles.srOnly}>
                  Gala name
                </label>
                <input
                  ref={nameInputRef}
                  id={nameId}
                  name="galaName"
                  type="text"
                  placeholder="Baguio Before Graduation"
                  maxLength={40}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  aria-describedby={errors.name ? `${nameId}-error` : undefined}
                  aria-invalid={errors.name ? 'true' : 'false'}
                  className={`${styles.pillInput} ${errors.name ? styles.pillInputError : ''}`}
                />

                {errors.name && (
                  <span id={`${nameId}-error`} role="alert" className={styles.errorPill}>
                    {errors.name}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleUseExample}
                  className={styles.useExampleBtn}
                >
                  <svg
                    className={styles.btnPlusIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Use example</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: When are we going? (Zest)                        */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className={styles.stepBody}>
              <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
                When are we going?
              </h1>
              <p className={styles.subCopy}>
                Let&apos;s turn &ldquo;someday&rdquo; into an actual date.
              </p>

              {/* 1) Trip Type Selector */}
              <fieldset className={styles.tripTypeFieldset}>
                <legend className={styles.srOnly}>How long is the gala?</legend>
                <div className={styles.tripTypeRow} role="radiogroup" aria-label="Trip type">
                  <label
                    htmlFor={`${tripTypeId}-daytour`}
                    className={`${styles.tripTypeOption} ${
                      tripType === 'DAY_TOUR' ? styles.tripTypeSelected : styles.tripTypeUnselected
                    }`}
                  >
                    <input
                      type="radio"
                      id={`${tripTypeId}-daytour`}
                      name="tripType"
                      value="DAY_TOUR"
                      checked={tripType === 'DAY_TOUR'}
                      onChange={() => {
                        setTripType('DAY_TOUR');
                        if (errors.days) setErrors((prev) => ({ ...prev, days: undefined }));
                      }}
                      className={styles.srOnly}
                    />
                    <span>Day tour</span>
                  </label>

                  <label
                    htmlFor={`${tripTypeId}-vacation`}
                    className={`${styles.tripTypeOption} ${
                      tripType === 'VACATION' ? styles.tripTypeSelected : styles.tripTypeUnselected
                    }`}
                  >
                    <input
                      type="radio"
                      id={`${tripTypeId}-vacation`}
                      name="tripType"
                      value="VACATION"
                      checked={tripType === 'VACATION'}
                      onChange={() => {
                        setTripType('VACATION');
                        if (errors.days) setErrors((prev) => ({ ...prev, days: undefined }));
                      }}
                      className={styles.srOnly}
                    />
                    <span>Vacation</span>
                  </label>
                </div>
              </fieldset>

              {/* Helper line under selector */}
              <p className={styles.tripTypeHelperText}>
                {tripType === 'DAY_TOUR'
                  ? 'One day. Pick the date and the time.'
                  : 'Multiple days. Pick the first day and how many days.'}
              </p>

              {/* 2) Date field: "Date" in Day tour, "First day" in Vacation */}
              <div className={styles.fieldGroup}>
                <label htmlFor={dateId} className={styles.label}>
                  {tripType === 'VACATION' ? 'First day' : 'Date'}
                </label>
                <input
                  ref={dateInputRef}
                  id={dateId}
                  name="date"
                  type="date"
                  min={todayStr}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  aria-describedby={errors.date ? `${dateId}-error` : undefined}
                  aria-invalid={errors.date ? 'true' : 'false'}
                  className={`${styles.pillInput} ${errors.date ? styles.pillInputError : ''}`}
                />

                {errors.date && (
                  <span id={`${dateId}-error`} role="alert" className={styles.errorPill}>
                    {errors.date}
                  </span>
                )}
              </div>

              {/* Vacation mode only: "How many days?" field */}
              {tripType === 'VACATION' && (
                <div className={styles.daysFieldGroup}>
                  <label htmlFor={daysId} className={styles.label}>
                    How many days?
                  </label>
                  <div className={styles.daysInputWrap}>
                    <button
                      type="button"
                      onClick={handleFewerDays}
                      className={styles.daysBtn}
                      aria-label="Fewer days"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>

                    <input
                      ref={daysInputRef}
                      id={daysId}
                      name="days"
                      type="number"
                      inputMode="numeric"
                      min="2"
                      max="30"
                      step="1"
                      placeholder="e.g. 3"
                      value={daysInput}
                      onChange={(e) => {
                        setDaysInput(e.target.value);
                        if (errors.days) setErrors((prev) => ({ ...prev, days: undefined }));
                      }}
                      aria-describedby={errors.days ? `${daysId}-error` : undefined}
                      aria-invalid={errors.days ? 'true' : 'false'}
                      className={`${styles.pillInput} ${styles.daysInput} ${
                        errors.days ? styles.pillInputError : ''
                      }`}
                    />

                    <button
                      type="button"
                      onClick={handleMoreDays}
                      className={styles.daysBtn}
                      aria-label="More days"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>

                  {errors.days && (
                    <span id={`${daysId}-error`} role="alert" className={styles.errorPill}>
                      {errors.days}
                    </span>
                  )}

                  {endsOnText && (
                    <div className={styles.endsOnLine} aria-live="polite">
                      Ends on {endsOnText}
                    </div>
                  )}
                </div>
              )}

              {/* Start time and End time (Required) */}
              <div className={styles.fieldGroup}>
                <div className={styles.timeRow}>
                  <div>
                    <label htmlFor={startTimeId} className={styles.label}>
                      Start time
                    </label>
                    <input
                      ref={startTimeInputRef}
                      id={startTimeId}
                      name="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        if (errors.startTime || errors.time) {
                          setErrors((prev) => ({
                            ...prev,
                            startTime: undefined,
                            time: undefined,
                          }));
                        }
                      }}
                      aria-describedby={
                        errors.startTime ? `${startTimeId}-error` : undefined
                      }
                      aria-invalid={errors.startTime || errors.time ? 'true' : 'false'}
                      className={`${styles.pillInput} ${
                        errors.startTime || errors.time ? styles.pillInputError : ''
                      }`}
                    />
                    {errors.startTime && (
                      <span id={`${startTimeId}-error`} role="alert" className={styles.errorPill}>
                        {errors.startTime}
                      </span>
                    )}
                  </div>

                  <div>
                    <label htmlFor={endTimeId} className={styles.label}>
                      End time
                    </label>
                    <input
                      ref={endTimeInputRef}
                      id={endTimeId}
                      name="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        if (errors.endTime || errors.time) {
                          setErrors((prev) => ({
                            ...prev,
                            endTime: undefined,
                            time: undefined,
                          }));
                        }
                      }}
                      aria-describedby={errors.endTime ? `${endTimeId}-error` : undefined}
                      aria-invalid={errors.endTime || errors.time ? 'true' : 'false'}
                      className={`${styles.pillInput} ${
                        errors.endTime || errors.time ? styles.pillInputError : ''
                      }`}
                    />
                    {errors.endTime && (
                      <span id={`${endTimeId}-error`} role="alert" className={styles.errorPill}>
                        {errors.endTime}
                      </span>
                    )}
                  </div>
                </div>

                {errors.time && (
                  <span role="alert" className={styles.errorPill}>
                    {errors.time}
                  </span>
                )}

                {tripType === 'VACATION' && (
                  <p className={styles.timeHelperText}>
                    Usual start and end time each day.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: Destination (Teal)                               */}
          {/* ======================================================== */}
          {step === 3 && (
            <div className={styles.stepBody}>
              <div className={styles.saanTayoTag}>
                <svg
                  className={styles.tagPinIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Saan Tayo?</span>
              </div>

              <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
                Where are we headed?
              </h1>
              <p className={styles.subCopy}>
                Type a place or pick one. You can add exact stops later.
              </p>

              <div className={styles.fieldGroup}>
                <label htmlFor={destinationId} className={styles.srOnly}>
                  Destination
                </label>
                <div className={styles.searchWrap}>
                  <svg
                    className={styles.searchIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    ref={destinationInputRef}
                    id={destinationId}
                    name="destination"
                    type="text"
                    placeholder="Search or type a destination"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      if (errors.destination) {
                        setErrors((prev) => ({ ...prev, destination: undefined }));
                      }
                    }}
                    aria-describedby={errors.destination ? `${destinationId}-error` : undefined}
                    aria-invalid={errors.destination ? 'true' : 'false'}
                    className={`${styles.pillInput} ${styles.searchInput} ${
                      errors.destination ? styles.pillInputError : ''
                    }`}
                  />
                </div>

                {errors.destination && (
                  <span id={`${destinationId}-error`} role="alert" className={styles.errorPill}>
                    {errors.destination}
                  </span>
                )}

                {/* Suggestion Chips */}
                <div className={styles.chipsRow} role="group" aria-label="Suggested destinations">
                  {destinationChips.map((chip) => {
                    const isSelected = destination.trim().toLowerCase() === chip.toLowerCase();
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleChipClick(chip)}
                        aria-pressed={isSelected}
                        className={`${styles.chipBtn} ${
                          isSelected ? styles.chipSelected : styles.chipUnselected
                        }`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden="true"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{chip}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Decorative map card (~130px tall, 3px cream border, 26px radius) */}
                <div className={styles.mapCard} aria-hidden="true">
                  <svg className={styles.mapSvg} viewBox="0 0 400 130" fill="none">
                    {/* Cream map road grid lines */}
                    <path
                      d="M -10 35 Q 80 50 160 20 T 320 40 T 420 25"
                      stroke="#fff8f2"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 60 -10 Q 75 70 140 140"
                      stroke="#fff8f2"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 240 -10 Q 220 60 290 140"
                      stroke="#fff8f2"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 120 70 Q 240 100 420 80"
                      stroke="#fff8f2"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />

                    {/* Rounded cream blocks representing landmarks/buildings */}
                    <rect x="20" y="8" width="30" height="20" rx="8" fill="#fff8f2" opacity="0.8" />
                    <rect x="180" y="38" width="40" height="24" rx="10" fill="#fff8f2" opacity="0.8" />
                    <rect x="280" y="80" width="35" height="24" rx="8" fill="#fff8f2" opacity="0.8" />
                    <rect x="330" y="10" width="45" height="20" rx="8" fill="#fff8f2" opacity="0.8" />
                  </svg>

                  <div className={styles.mapDestinationPill}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{destination.trim() ? destination.trim() : 'Anywhere'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: Password (Blossom)                               */}
          {/* ======================================================== */}
          {step === 4 && (
            <div className={styles.stepBody}>
              <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
                Create a gala password
              </h1>
              <p className={styles.subCopy}>
                You&apos;ll need this if you come back later.
              </p>

              <div className={styles.fieldGroup}>
                <label htmlFor={passwordId} className={styles.label}>
                  Password
                </label>
                <div className={styles.passwordInputWrap}>
                  <input
                    ref={passwordInputRef}
                    id={passwordId}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    aria-describedby={errors.password ? `${passwordId}-error` : undefined}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    className={`${styles.pillInput} ${styles.passwordInput} ${
                      errors.password ? styles.pillInputError : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={styles.eyeToggleBtn}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password strength meter: 3 pills (44x8px) + text label */}
                <div className={styles.strengthMeter} aria-live="polite">
                  <div className={styles.strengthPills} aria-hidden="true">
                    <span
                      className={`${styles.strengthPill} ${
                        strength.level >= 1
                          ? strength.level === 1
                            ? styles.strengthPillWeak
                            : strength.level === 2
                            ? styles.strengthPillGood
                            : styles.strengthPillStrong
                          : ''
                      }`}
                    />
                    <span
                      className={`${styles.strengthPill} ${
                        strength.level >= 2
                          ? strength.level === 2
                            ? styles.strengthPillGood
                            : styles.strengthPillStrong
                          : ''
                      }`}
                    />
                    <span
                      className={`${styles.strengthPill} ${
                        strength.level >= 3 ? styles.strengthPillStrong : ''
                      }`}
                    />
                  </div>
                  <span className={styles.strengthText}>
                    {password ? strength.label : 'Weak'}
                  </span>
                </div>

                {errors.password && (
                  <span id={`${passwordId}-error`} role="alert" className={styles.errorPill}>
                    {errors.password}
                  </span>
                )}

                <label htmlFor={confirmPasswordId} className={styles.label}>
                  Confirm password
                </label>
                <div className={styles.passwordInputWrap}>
                  <input
                    ref={confirmPasswordInputRef}
                    id={confirmPasswordId}
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    aria-describedby={
                      errors.confirmPassword ? `${confirmPasswordId}-error` : undefined
                    }
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    className={`${styles.pillInput} ${styles.passwordInput} ${
                      errors.confirmPassword ? styles.pillInputError : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className={styles.eyeToggleBtn}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {errors.confirmPassword && (
                  <span
                    id={`${confirmPasswordId}-error`}
                    role="alert"
                    className={styles.errorPill}
                  >
                    {errors.confirmPassword}
                  </span>
                )}

                {/* Two cream info cards (22px radius) */}
                <div className={styles.infoCardsStack}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoIconWrap} aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
                      </svg>
                    </div>
                    <p className={styles.infoText}>
                      <strong>Gala Code</strong> identifies your gala. Friends use it to join.
                    </p>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIconWrap} aria-hidden="true">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <p className={styles.infoText}>
                      <strong>Gala Password</strong> is private. Use it with the code to come back later.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer: Back & Next Buttons */}
          <footer className={styles.footerButtons}>
            {step === 1 ? (
              <Link href="/" className={styles.backBtn}>
                Back
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className={styles.backBtn}
              >
                Back
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.nextBtn}
              id={step === 4 ? 'createGalaBtn' : `nextStep${step}Btn`}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  <span>Creating...</span>
                </>
              ) : step === 4 ? (
                'Create the Gala'
              ) : (
                'Next'
              )}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}
