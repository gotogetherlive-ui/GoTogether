"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            color: "#0f172a",
          }}
        >
          <div
            style={{
              width: "min(100%, 480px)",
              padding: 32,
              border: "1px solid #e2e8f0",
              borderRadius: 24,
              background: "white",
              textAlign: "center",
            }}
          >
            <title>Service temporarily unavailable | GoTogether</title>
            <h1>GoTogether is temporarily unavailable</h1>
            <p style={{ color: "#475569", lineHeight: 1.6 }}>
              A required service could not be reached. Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                marginTop: 16,
                border: 0,
                borderRadius: 999,
                padding: "12px 24px",
                background: "#f97316",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}