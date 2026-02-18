import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "醫案 - 한방 임상 연구 노트",
  description: "한의학 임상 사례 데이터베이스 및 AI 연구 비서",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
