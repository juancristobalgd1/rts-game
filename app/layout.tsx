import type { Metadata, Viewport } from "next"
import { Orbitron, Rajdhani } from "next/font/google"
import "./globals.css"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
})

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
})

export const metadata: Metadata = {
  title: "Galactic Conquest | Real-Time Strategy",
  description: "Command your faction, gather resources, build armies, and conquer the galaxy in this epic RTS experience inspired by StarCraft.",
}

export const viewport: Viewport = {
  themeColor: "#0a0a14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <body className="font-sans antialiased overflow-hidden">{children}</body>
    </html>
  )
}
