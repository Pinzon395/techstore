import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'
import Navbar from '@/components/layout/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TechStore — PCs & Tech',
  description: 'Best PCs and tech products at the best prices.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <footer className="mt-20 bg-gray-900 text-gray-400 py-10 text-center text-sm">
              <p>© 2026 TechStore · Built with ❤️ · 
                <a href="https://instagram.com/YOUR_INSTAGRAM" target="_blank" rel="noopener" className="text-brand-light ml-1 hover:text-white transition-colors">
                  Instagram
                </a>
              </p>
            </footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
