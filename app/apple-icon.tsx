import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 180,
  height: 180,
};

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#060606",
          color: "#fbbf24",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "4px solid rgba(251, 191, 36, 0.18)",
            borderRadius: "42px",
            display: "flex",
            fontFamily: "Georgia, serif",
            fontSize: 104,
            fontWeight: 700,
            height: 132,
            lineHeight: 1,
            alignItems: "center",
            justifyContent: "center",
            width: 132,
          }}
        >
          M
        </div>
      </div>
    ),
    size,
  );
}
