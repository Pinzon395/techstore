'use client'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { ShoppingCart, User, Monitor, Instagram, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user } = useAuth()
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand">
            <Monitor size={24} />
            TechStore
          </Link>

          {/* Search bar (desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <input
              type="search"
              placeholder="Search PCs, components..."
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Instagram */}
            <a
              href="https://instagram.com/YOUR_INSTAGRAM"
              target="_blank"
              rel="noopener"
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-pink-500 transition-colors"
            >
              <Instagram size={18} />
            </a>

            {/* Cart */}
            <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ShoppingCart size={22} className="text-gray-600" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  )}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700" onClick={() => setMenuOpen(false)}>
                      <User size={16} /> My Account
                    </Link>
                    <button
                      onClick={() => { signOut(auth); setMenuOpen(false) }}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-sm text-red-500 w-full text-left"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/login" className="btn-primary text-sm py-2 px-4">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
