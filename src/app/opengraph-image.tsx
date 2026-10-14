import { ImageResponse } from "next/og";

export const alt = "Paranoia Studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000",
          color: "#fafafa",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>paranoiastudio.fr</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 0.9 }}>Paranoia</div>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 0.9 }}>
            Studio<span style={{ color: "#a78bfa" }}>.</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#d4d4d8" }}>Cartes à collectionner, casino en ParaCoins, launcher Minecraft.</div>
      </div>
    ),
    size
  );
}
