'use client'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const { items, remove, update, total, clear } = useCart()
  const { user } = useAuth()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-200 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
        <p className="text-gray-400 mb-8">Add some products to get started.</p>
        <Link href="/" className="btn-primary">Browse Products</Link>
      </div>
    )
  }

  const handleCheckout = () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    alert('Checkout coming soon! For now, contact us via WhatsApp to complete your order.')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Shopping Cart ({items.length} items)</h1>
        <button onClick={clear} className="text-sm text-red-400 hover:text-red-600 transition-colors">Clear all</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.id} className="card p-4 flex gap-4 items-center">
              <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-brand font-bold text-lg">${item.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => update(item.id, item.qty - 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-semibold">{item.qty}</span>
                <button onClick={() => update(item.id, item.qty + 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="font-bold text-gray-900">${(item.price * item.qty).toLocaleString()}</p>
                <button onClick={() => remove(item.id)} className="text-red-400 hover:text-red-600 transition-colors mt-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card p-6 h-fit sticky top-20">
          <h2 className="font-bold text-lg mb-6">Order Summary</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span className="text-green-500">{total >= 500 ? 'FREE' : '$50'}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${(total >= 500 ? total : total + 50).toLocaleString()}</span>
            </div>
          </div>
          <button onClick={handleCheckout} className="btn-primary w-full text-center">
            Proceed to Checkout
          </button>
          <Link href="/" className="btn-secondary w-full text-center mt-3 block">
            Continue Shopping
          </Link>
          {!user && (
            <p className="text-xs text-gray-400 text-center mt-4">You need to <Link href="/auth/login" className="text-brand">sign in</Link> to checkout</p>
          )}
        </div>
      </div>
    </div>
  )
}
