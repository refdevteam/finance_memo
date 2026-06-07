import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import fs from 'fs'

try {
  const baseDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\1af170df-ccb2-4f2c-be03-246aa17a635c'
  const srcLogo = `${baseDir}\\media__1780856774634.png`
  const srcMascot = `${baseDir}\\media__1780856779571.png`

  const destLogo = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\logo-circle.png'
  const destMascot = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\mascot.png'
  const dest512 = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\icon-512.png'
  const dest192 = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\icon-192.png'

  if (fs.existsSync(srcLogo)) {
    fs.copyFileSync(srcLogo, destLogo)
    fs.copyFileSync(srcLogo, dest512)
    fs.copyFileSync(srcLogo, dest192)
    console.log('--- NEW LOGO COPIED IN LAYOUT.tsx ---')
  }
  if (fs.existsSync(srcMascot)) {
    fs.copyFileSync(srcMascot, destMascot)
    console.log('--- NEW MASCOT COPIED IN LAYOUT.tsx ---')
  }
} catch (e) {
  console.error('--- LOGO/MASCOT COPY ERROR ---', e)
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
