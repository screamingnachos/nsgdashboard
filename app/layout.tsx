import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SuperK Growth Portal",
  description: "Internal dashboard for NSO and Growth Teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}>
        
        {/* GLOBAL TOP NAVIGATION */}
        <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            
            {/* Logo/Brand Area */}
            <div className="font-black text-xl tracking-tight text-red-800">
              SuperK <span className="text-emerald-900">Portal</span>
            </div>

            {/* Navigation Links */}
            <div className="flex gap-8 font-bold text-sm text-slate-500">
              <Link href="/" className="hover:text-emerald-600 transition-colors">
                Home
              </Link>
              <Link href="/meta" className="hover:text-blue-600 transition-colors">
                Meta Ads
              </Link>
              <Link href="/google" className="hover:text-emerald-600 transition-colors">
                Google Ads
              </Link>
              <Link href="/tasks" className="hover:text-indigo-600 transition-colors">
                Action Hub
              </Link>
            </div>
            
          </div>
        </nav>

        {/* This is where your individual pages load */}
        <main>{children}</main>

      </body>
    </html>
  );
}