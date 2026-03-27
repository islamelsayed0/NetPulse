import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "NetPulse — IT operations monitoring";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0d1117",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <svg width="72" height="72" viewBox="0 0 64 64" fill="none">
            <path
              d="M8 40 Q20 8 32 32 T56 24"
              stroke="#22d3ee"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span style={{ fontSize: 64, fontWeight: 700, color: "#22d3ee" }}>
            NetPulse
          </span>
        </div>
        <div style={{ fontSize: 28, color: "#8b949e" }}>
          IT Operations Command Center
        </div>
      </div>
    ),
    { ...size }
  );
}
