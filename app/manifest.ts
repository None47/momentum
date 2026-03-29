import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MOMENTUM",
    short_name: "MOMENTUM",
    description: "Goutham's personal Life OS. 577 days to ₹60 LPA.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060606",
    theme_color: "#060606",
    icons: [
      {
        src: "/icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon?size=512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon?size=180",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
