import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import LangProvider from "@/components/LangProvider";
import ThemeProvider from "@/components/ThemeProvider";
import { ToastProvider } from "@/features/common/useToast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ECDM Core — ERP & CRM Platform",
  description: "Enterprise-grade ERP and CRM system by ECDM Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <LangProvider>
            <ToastProvider />
            {children}
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


