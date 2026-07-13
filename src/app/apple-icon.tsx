import { ImageResponse } from "next/og";

// iOS-icoon voor "Zet op beginscherm". Rood Sparta-tegeltje met witte T.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#C8102E",
          color: "#ffffff",
          fontSize: 120,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}
