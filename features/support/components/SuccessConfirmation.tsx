interface SuccessConfirmationProps {
  ticketId: string | null;
  onReset: () => void;
}

/**
 * SuccessConfirmation — replaces the form after successful ticket submission.
 */
export function SuccessConfirmation({
  ticketId,
  onReset,
}: SuccessConfirmationProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '3rem 1.5rem',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '0.75rem',
        }}
      >
        Ticket Submitted!
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
        Your support request has been received.
      </p>
      {ticketId && (
        <p
          style={{
            color: '#3b82f6',
            fontWeight: 600,
            marginBottom: '2rem',
            fontSize: '0.9rem',
          }}
        >
          Ticket ID: {ticketId}
        </p>
      )}
      <button
        onClick={onReset}
        type="button"
        style={{
          padding: '0.625rem 1.5rem',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '0.95rem',
        }}
      >
        Submit Another Request
      </button>
    </div>
  );
}