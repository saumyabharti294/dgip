import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DGIP — Distributed Genetic Intelligence Platform",
  description:
    "Production-grade multi-agent hybrid retrieval system with MCP integration",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
