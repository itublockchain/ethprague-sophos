import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WalletProvider from "@/provider/WalletProvider";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sagittarius",
  description: "Sagittarius is a platform for managing your business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`flex flex-col min-h-screen w-full ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader showSpinner={false} color="black" />
        <WalletProvider>{children}</WalletProvider>
        <Toaster />
      </body>
    </html>
  );
}
