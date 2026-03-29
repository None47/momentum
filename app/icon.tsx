import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 512,
  height: 512,
};

export default function Icon() {
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
            border: "8px solid rgba(251, 191, 36, 0.18)",
            borderRadius: "120px",
            display: "flex",
            fontFamily: "Georgia, serif",
            fontSize: 280,
            fontWeight: 700,
            height: 360,
            lineHeight: 1,
            alignItems: "center",
            justifyContent: "center",
            width: 360,
          }}
        >
          M
        </div>
      </div>
    ),
    size,
  );
}
