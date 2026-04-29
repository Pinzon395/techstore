'use client'
import { useState } from 'react'
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Monitor, Mail, Lock, User, Chrome } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const saveUser = async (uid: string, displayName: string, email: string) => {
    await setDoc(doc(db, 'users', uid), { name: displayName, email, createdAt: new Date(), orders: [] }, { merge: true })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name })
      await saveUser(user.uid, name, email)
      router.push('/')
    } catch (err: any) {
      setError(err.code === 'auth/email-already-in-use' ? 'Email already registered.' : 'Error creating account.')
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      const { user } = await signInWithPopup(auth, googleProvider)
      await saveUser(user.uid, user.displayName || '', user.email || '')
      router.push('/')
    } catch { setError('Could not sign up with Google.') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-brand font-bold text-xl mb-6">
            <Monitor size={28} /> TechStore
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-400 mt-1">Join TechStore today</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6">{error}</div>}

        <button onClick={handleGoogle} disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-3 mb-6">
          <Chrome size={18} className="text-blue-500" /> Sign up with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
          <div className="relative text-center"><span className="bg-white px-3 text-sm text-gray-400">or with email</span></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="input pl-10" />
          </div>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input pl-10" />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="input pl-10" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
