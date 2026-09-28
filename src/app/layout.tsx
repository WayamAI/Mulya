import type { Metadata } from "next";
import { Geist, Michroma } from "next/font/google";
import type { ReactNode } from "react";

import { ShellGate } from "@/components/layout/shell-gate";
import { ThemeProvider } from "@/context/theme-context";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/* Functional UI face: the default for the whole interface. */
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

/* Display face: identity, page titles, cost figures only. */
const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const SITE_TITLE = "Mūlya · Manufacturing Cost Estimation";
const SITE_DESCRIPTION =
  "Should-cost estimation for truck part design engineers: cost breakdowns, price breaks and revision comparison.";
/** Social card, 1200×630. */
const SOCIAL_IMAGE = { url: "/brand/mulya-og.jpg", width: 1200, height: 630, alt: "Mūlya, manufacturing cost estimation" };

/** Absolute origin for the social image: the Vercel production host when deployed, localhost otherwise. */
const siteOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/brand/mulya-mark.svg",
    apple: "/brand/mulya-mark.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Mūlya",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // No cookies() here, so every page can be prerendered. The theme is applied
  // before paint by THEME_INIT_SCRIPT, which is why <html> suppresses the
  // hydration warning for the attributes it sets.
  return (
    <html
      lang="en"
      data-theme="light"
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
      className={`${geist.variable} ${michroma.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full overflow-hidden">
        <ThemeProvider>
          <ShellGate>{children}</ShellGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
