import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advance — Tour Management",
  description: "AI-powered tour management for artist managers",
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
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
