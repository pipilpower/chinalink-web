import type { Metadata } from 'next'
import { Syne, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'Chinalink — Estimador de Importación desde China',
  description:
    'Calcula el costo real de importar desde China a El Salvador: landed cost, aranceles, flete y riesgo en segundos.',
  keywords: ['importación', 'china', 'el salvador', 'landed cost', 'aranceles', 'flete'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${syne.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-bg text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
