import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BackgroundMusic from "@/components/BackgroundMusic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chernobyl Explorer v4",
  description: "Workshop & Bunker Expansion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BackgroundMusic />
        {children}
      </body>
    </html>
  );
}
