import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "墨香书店 - 独立书店在线预留系统",
  description: "独立书店库存与在线预留系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen font-serif">
        {children}
      </body>
    </html>
  );
}
