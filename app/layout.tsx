import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "MOMENTUM",
  title: "MOMENTUM — Day by Day",
  description: "Goutham's personal Life OS. 577 days to ₹60 LPA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MOMENTUM",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: "/apple-icon?size=180", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#060606",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className={`${jetbrainsMono.className} bg-[#060606] text-[#e5e5e5] min-h-screen antialiased`}>
        <ServiceWorkerRegistrar />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
