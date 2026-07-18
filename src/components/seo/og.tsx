import { ImageResponse } from "next/og";
import { DEFAULT_TITLE, SITE_NAME } from "@/constants/site";

/**
 * Shared 1200×630 social-share image, rendered on demand by `next/og` (no external
 * dependency, no static asset to maintain). Consumed by both the Open Graph and Twitter
 * image route conventions so they stay identical.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = DEFAULT_TITLE;
export const OG_CONTENT_TYPE = "image/png";

export function renderOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #1a2744 0%, #312e81 60%, #4338ca 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#ffffff",
              color: "#4338ca",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 800,
            }}
          >
            O
          </div>
          <div style={{ fontSize: "40px", fontWeight: 700, letterSpacing: "-1px" }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: "68px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-2px" }}>
            Accurate OCR for invoices, receipts & documents
          </div>
          <div style={{ fontSize: "34px", color: "#c7d2fe", lineHeight: 1.3 }}>
            Turn documents into structured JSON/CSV data in seconds.
          </div>
        </div>

        <div style={{ fontSize: "28px", color: "#a5b4fc" }}>ocrparse.com</div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
