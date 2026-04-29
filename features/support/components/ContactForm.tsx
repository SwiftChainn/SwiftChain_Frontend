'use client';

import { useContactForm, SUPPORT_CATEGORIES } from '@/hooks/useContactForm';
import { SuccessConfirmation } from './SuccessConfirmation';

/**
 * ContactForm — support ticket submission form.
 * Delegates all logic to useContactForm hook.
 * On success, renders SuccessConfirmation in place of the form.
 */
export function ContactForm() {
  const {
    form,
    isSubmitting,
    isSuccess,
    ticketId,
    attachment,
    attachmentError,
    handleAttachmentChange,
    onSubmit,
    resetForm,
  } = useContactForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  if (isSuccess) {
    return <SuccessConfirmation ticketId={ticketId} onReset={resetForm} />;
  }

  const fieldStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.95rem',
    color: '#111827',
    background: '#fff',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 500,
    marginBottom: '0.375rem',
    color: '#374151',
    fontSize: '0.9rem',
  };

  const errorStyle = {
    color: '#ef4444',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Subject */}
      <div>
        <label htmlFor="subject" style={labelStyle}>
          Subject <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          id="subject"
          type="text"
          placeholder="Brief description of your issue"
          style={fieldStyle}
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
          {...register('subject')}
        />
        {errors.subject && (
          <p id="subject-error" style={errorStyle} role="alert">
            {errors.subject.message}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" style={labelStyle}>
          Category <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <select
          id="category"
          style={fieldStyle}
          aria-invalid={!!errors.category}
          aria-describedby={errors.category ? 'category-error' : undefined}
          {...register('category')}
        >
          <option value="">Select a category</option>
          {SUPPORT_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p id="category-error" style={errorStyle} role="alert">
            {errors.category.message}
          </p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" style={labelStyle}>
          Message <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          id="message"
          rows={6}
          placeholder="Describe your issue in detail (minimum 20 characters)"
          style={{ ...fieldStyle, resize: 'vertical' }}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          {...register('message')}
        />
        {errors.message && (
          <p id="message-error" style={errorStyle} role="alert">
            {errors.message.message}
          </p>
        )}
      </div>

      {/* Attachment */}
      <div>
        <label htmlFor="attachment" style={labelStyle}>
          Attachment{' '}
          <span style={{ color: '#9ca3af', fontWeight: 400 }}>
            (optional — PNG, JPG, GIF, PDF up to 5MB)
          </span>
        </label>
        <input
          id="attachment"
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.pdf"
          style={{ ...fieldStyle, padding: '0.5rem' }}
          onChange={(e) =>
            handleAttachmentChange(e.target.files?.[0] ?? null)
          }
        />
        {attachment && (
          <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Selected: {attachment.name}
          </p>
        )}
        {attachmentError && (
          <p style={errorStyle} role="alert">
            {attachmentError}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: '0.75rem',
          background: isSubmitting ? '#93c5fd' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {isSubmitting ? 'Submitting…' : 'Submit Support Request'}
      </button>
    </form>
  );
}