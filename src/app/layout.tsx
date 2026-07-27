import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientTalk Coach",
  description: "Private client-negotiation practice for software developers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
