'use client'
import { useState } from 'react'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Monitor, Mail, Lock, Chrome } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/')
    } catch (err: any) {
      setError(err.code === 'auth/invalid-credential' ? 'Wrong email or password.' : 'Error signing in. Try again.')
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      await signInWithPopup(auth, googleProvider)
      router.push('/')
    } catch (err: any) {
      setError('Could not sign in with Google.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-brand font-bold text-xl mb-6">
            <Monitor size={28} /> TechStore
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-400 mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="btn-secondary w-full flex items-center justify-center gap-3 mb-6"
        >
          <Chrome size={18} className="text-blue-500" />
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
          <div className="relative text-center"><span className="bg-white px-3 text-sm text-gray-400">or with email</span></div>
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input pl-10" />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="input pl-10" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-brand font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
