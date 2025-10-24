import "./globals.css";
import { ReactNode } from "react";
import { ThemeProvider } from "../components/contexts/ThemeProvider";
import { GoogleOAuthProvider } from "@react-oauth/google"; // 1. Import

export const metadata = {
  title: "MockMarket",
  description: "Virtual stock trading practice app",
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
