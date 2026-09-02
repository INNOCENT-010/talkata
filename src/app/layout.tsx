import type { Metadata } from "next"
import SessionWatcher from "@/components/SessionWatcher"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://talkata.space"),
  title: { default: "Talkata | Text to Speech", template: "%s | Talkata" },
  description: "Turn scripts, articles, and product copy into natural sounding audio with Talkata.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Talkata",
    title: "Talkata | Text to Speech",
    description: "Text to speech for creators, teams, and developers.",
    url: "https://talkata.space",
  },
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
