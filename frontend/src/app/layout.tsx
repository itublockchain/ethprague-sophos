import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { NitroliteClientWrapper } from "@/context/NitroliteClientWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sophos",
  description: "Bet you can't beat the pawn!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/sophos.png" />
      </head>
      <body
        className={`flex flex-col min-h-screen w-full ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader showSpinner={false} color="black" />
        <NitroliteClientWrapper>
          <WebSocketProvider>{children}</WebSocketProvider>
        </NitroliteClientWrapper>

        <Toaster />
      </body>
    </html>
  );
}
