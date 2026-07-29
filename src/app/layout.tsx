import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getDictionary } from "@/i18n/dictionaries";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NadamuDash - VPN Panel",
  description: "Secure Xray Access",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dictionary = await getDictionary();
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-background text-foreground min-h-screen selection:bg-primary/30`}>
        <LanguageProvider dictionary={dictionary}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
