import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Narrative Alpha - AI Investment Research",
  description: "AI-powered investment research dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}

