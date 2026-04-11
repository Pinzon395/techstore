'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { User, Mail, LogOut, ShoppingBag, Instagram } from 'lucide-react'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  if (loading || !user) return <div className="text-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">My Account</h1>

      <div className="card p-6 mb-6 flex items-center gap-5">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center text-2xl font-bold">
            {user.email?.[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-xl font-bold text-gray-900">{user.displayName || 'User'}</p>
          <p className="text-gray-400 flex items-center gap-1"><Mail size={14} /> {user.email}</p>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={18} className="text-brand" />
          <h2 className="font-semibold">My Orders</h2>
        </div>
        <p className="text-gray-400 text-sm">No orders yet. <a href="/" className="text-brand hover:underline">Start shopping!</a></p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Instagram size={18} className="text-pink-500" />
          <h2 className="font-semibold">Follow us</h2>
        </div>
        <a href="https://instagram.com/YOUR_INSTAGRAM" target="_blank" rel="noopener"
          className="text-pink-500 hover:underline text-sm">@YOUR_INSTAGRAM</a>
      </div>

      <button
        onClick={() => { signOut(auth); router.push('/') }}
        className="flex items-center gap-2 text-red-400 hover:text-red-600 transition-colors"
      >
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  )
}
