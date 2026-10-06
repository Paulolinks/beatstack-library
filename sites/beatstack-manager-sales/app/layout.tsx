import type { Metadata } from "next";
import { Geist, Syne } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://beatstack.paulolinks.com";

export const metadata: Metadata = {
  title: "BeatStack Manager — Your Personal Splice for Your Own Samples",
  description:
    "Organize your sample library like a pro. Upload, preview, hashtag, rate, and search your sounds. One-time payment $47 launch offer — no monthly subscription.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "BeatStack Manager — Your Personal Splice for Your Own Samples",
    description:
      "Turn your messy sample collection into a clean, searchable production library. Launch offer: $47 one-time.",
    type: "website",
    url: siteUrl,
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "BeatStack Manager" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BeatStack Manager",
    description: "Your personal Splice for managing your own samples. $47 launch offer.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${syne.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
