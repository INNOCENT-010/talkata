import type { Metadata } from "next"
import SessionWatcher from "@/components/SessionWatcher"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Talkata — AI Voice Generation",
  description: "Generate natural sounding voice from text instantly",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0a0a0f] antialiased`}>
        <SessionWatcher />
        {children}
      </body>
    </html>
  )
}