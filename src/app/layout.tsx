import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { FloatingMascot } from "@/components/layout/FloatingMascot";


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
  icons: {
    icon: '/logo-circle.png',
    shortcut: '/logo-circle.png',
    apple: '/logo-circle.png',
  }
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
          <FloatingMascot />
        </ThemeProvider>
      </body>
    </html>
  );
}
