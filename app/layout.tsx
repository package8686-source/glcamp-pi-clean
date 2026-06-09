import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLcamp Proforma Invoice Generator",
  description: "Generate and export GLcamp proforma invoices."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
