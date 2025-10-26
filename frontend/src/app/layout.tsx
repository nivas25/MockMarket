import "./globals.css";
import { ReactNode } from "react";
import { ThemeProvider } from "../components/contexts/ThemeProvider";
import { GoogleOAuthProvider } from "@react-oauth/google"; // 1. Import

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "MockMarket",
  description: "Virtual stock trading practice app",
  applicationName: "MockMarket",
  authors: [{ name: "MockMarket" }],
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
      <body>
        {/* 2. Wrap the app. It's okay to put it inside ThemeProvider. */}
        <ThemeProvider>
          <GoogleOAuthProvider clientId={googleClientId}>
            {children}
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
