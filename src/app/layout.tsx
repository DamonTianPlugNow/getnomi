import type { Metadata } from "next";
import { Rosarivo, Mulish } from "next/font/google";
import "./globals.css";

const rosarivo = Rosarivo({
  variable: "--font-rosarivo",
  subsets: ["latin"],
  weight: ["400"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nomi - Your Digital World Manual",
  description: "Create your AI-powered personal context that works everywhere. Your story, always with you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rosarivo.variable} ${mulish.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
