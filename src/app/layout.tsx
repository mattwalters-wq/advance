import type { Metadata } from "next";
import FloatingAssistant from "@/components/FloatingAssistant";

export const metadata: Metadata = {
  title: "Advance — Tour Management",
  description: "Drop a doc. Your tour builds itself. Advance reads itineraries, flight confirmations, hotel bookings and venue worksheets — then builds and updates the tour automatically. Built for indie artist managers.",
  openGraph: {
    title: "Advance — Tour Management",
    description: "Drop a doc. Your tour builds itself. Built for indie artist managers who are done patching things together. Replaces Master Tour, spreadsheets, PDF day sheets and email threads.",
    url: "https://getadvance.co",
    siteName: "Advance",
    images: [
      {
        url: "https://getadvance.co/og-image.png",
        width: 1200,
        height: 630,
        alt: "Advance — Tour Management",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Advance — Tour Management",
    description: "Drop a doc. Your tour builds itself. Built for indie artist managers who are done patching things together.",
    images: ["https://getadvance.co/og-image.png"],
  },
  metadataBase: new URL("https://getadvance.co"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* font-display:swap prevents FOIT, optional subset reduces payload */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&display=swap&subset=latin"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}<FloatingAssistant /></body>
    </html>
  );
}
