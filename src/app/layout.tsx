import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import fs from 'fs'

try {
  const src = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\1af170df-ccb2-4f2c-be03-246aa17a635c\\fimo_logo_1780710969362.png'
  const dest512 = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\icon-512.png'
  const dest192 = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\icon-192.png'
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest512)
    fs.copyFileSync(src, dest192)
    console.log('--- LOGO COPIED IN LAYOUT.tsx ---')
  }
} catch (e) {
  console.error('--- LOGO COPY ERROR ---', e)
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: {
    template: '%s | Fimo',
    default: 'Fimo - Kelola Keuangan dengan AI',
  },
  description: 'Aplikasi pengelolaan keuangan pribadi yang cerdas dengan fitur scan struk AI.',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("font-sans", inter.variable, jetbrainsMono.variable)}>
      <body className="antialiased font-sans bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegister />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
