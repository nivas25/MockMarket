import "./globals.css";
import { ReactNode, Suspense } from "react";
import { ThemeProvider } from "../components/contexts/ThemeProvider";
import { GoogleOAuthProvider } from "@react-oauth/google"; // 1. Import
import SWRProvider from "../components/providers/SWRProvider";
import RouteProgress from "../components/providers/RouteProgress";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "MockMarket",
  description: "Virtual stock trading practice app",
  applicationName: "MockMarket",
  authors: [{ name: "MockMarket" }],
  icons: {
    icon: "/rabbit/mm_logo.png",
    shortcut: "/rabbit/mm_logo.png",
    apple: "/rabbit/mm_logo.png",
  },
  openGraph: {
    type: "website",
    title: "MockMarket",
    description: "Virtual stock trading practice app",
    url: "/",
    siteName: "MockMarket",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "MockMarket" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MockMarket",
    description: "Virtual stock trading practice app",
    images: ["/og.png"],
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error(
      "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable"
    );
  }

  return (
    <html lang="en">
      <head>
        {/* Preconnect to backend API to reduce handshake latency */}
        {/* Fallback link tag for favicon (some user agents) */}
        <link rel="icon" href="/rabbit/mm_logo.png" sizes="any" />
        <link
          rel="preconnect"
          href={
            process.env.NEXT_PUBLIC_API_URL ||
            process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
            "http://localhost:5000"
          }
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {/* 2. Wrap the app. It's okay to put it inside ThemeProvider. */}
        <ThemeProvider>
          <GoogleOAuthProvider clientId={googleClientId}>
            {/* useSearchParams hook inside RouteProgress needs a Suspense boundary */}
            <Suspense fallback={null}>
              <RouteProgress />
            </Suspense>
            <SWRProvider>{children}</SWRProvider>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
