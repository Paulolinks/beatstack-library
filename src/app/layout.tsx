import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { LicenseAdminShell } from "@/components/LicenseAdminShell";
import { getAppTitle, isLicenseServerMode } from "@/lib/app-mode";
import { isLicenseHost } from "@/lib/app-mode-request";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: getAppTitle(),
  description: isLicenseServerMode()
    ? "Painel de licenças BeatStack Manager"
    : "Seu sample pack manager estilo Splice",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const host = (await headers()).get("host");
  const licenseServer = isLicenseHost(host);

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        {licenseServer ? (
          <LicenseAdminShell>{children}</LicenseAdminShell>
        ) : (
          <AppShell>{children}</AppShell>
        )}
      </body>
    </html>
  );
}
