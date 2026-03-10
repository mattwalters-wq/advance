import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata = {
  title: "stamps land - the stamps fan community",
  description: "a fan community built by the band, for the fans. post, connect, earn stamps, and unlock exclusive rewards from the stamps.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "stamps land",
  },
  openGraph: {
    title: "stamps land",
    description: "a fan community built by the band, for the fans. post, connect, earn stamps, and unlock exclusive rewards.",
    url: "https://stamps-land.com",
    siteName: "stamps land",
    images: [
      {
        url: "https://stamps-land.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "stamps land - the stamps fan community",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "stamps land",
    description: "a fan community built by the band, for the fans.",
    images: ["https://stamps-land.com/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
