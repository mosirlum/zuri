"use client";

// The only thing that catches a failure in the root layout. It renders its own
// html and body because at this point nothing above it is standing.
export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf7f1",
        color: "#1c1814",
        fontFamily: "Georgia, 'Times New Roman', serif",
        textAlign: "center",
        padding: "24px",
      }}>
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Zuri Business OS</h1>
        <p style={{ fontSize: "14px", color: "#8a8378", marginBottom: "20px", maxWidth: "360px" }}>
          The application failed to start. Reload the page, and tell Mo if it happens again.
        </p>
        {error.digest && (
          <p style={{ fontSize: "12px", color: "#8a8378", fontFamily: "monospace", marginBottom: "20px" }}>
            Reference: {error.digest}
          </p>
        )}
        <button onClick={reset} style={{
          background: "#b8843a",
          color: "#1c1814",
          border: "none",
          borderRadius: "12px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}>
          Reload
        </button>
      </body>
    </html>
  );
}
