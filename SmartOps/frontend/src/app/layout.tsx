import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartOps AI",
  description: "AI Agent — Text, Image & Document Analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-surface-900 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
