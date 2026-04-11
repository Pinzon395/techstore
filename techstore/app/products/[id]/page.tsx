'use client'
import { useParams, useRouter } from 'next/navigation'
import { products } from '@/lib/products'
import { useCart } from '@/lib/cart-context'
import { Star, ShoppingCart, ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function ProductPage() {
  const { id } = useParams()
  const router = useRouter()
  const { add, items } = useCart()
  const [added, setAdded] = useState(false)

  const product = products.find(p => p.id === id)
  if (!product) return <div className="text-center py-20">Product not found. <Link href="/" className="text-brand">Go back</Link></div>

  const inCart = items.some(i => i.id === product.id)
  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3)
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0

  const handleAdd = () => {
    add({ id: product.id, name: product.name, price: product.price, image: product.image })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-brand mb-8 transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        {/* Image */}
        <div className="rounded-2xl overflow-hidden bg-gray-50 h-96">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>

        {/* Info */}
        <div>
          <p className="text-brand text-sm font-medium mb-2">{product.category}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={16} className={i <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
              ))}
            </div>
            <span className="text-sm text-gray-500">{product.rating} ({product.reviews} reviews)</span>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-bold text-gray-900">${product.price.toLocaleString()}</span>
            {product.oldPrice && (
              <>
                <span className="text-xl text-gray-400 line-through">${product.oldPrice.toLocaleString()}</span>
                <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-1 rounded-lg">-{discount}%</span>
              </>
            )}
          </div>

          <p className="text-gray-600 leading-relaxed mb-8">{product.description}</p>

          {/* Specs */}
          <div className="card p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Specifications</h3>
            <div className="space-y-3">
              {Object.entries(product.specs).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-400">{key}</span>
                  <span className="font-medium text-gray-900">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAdd}
              className={`btn-primary flex items-center gap-2 flex-1 justify-center ${added ? 'bg-green-500 hover:bg-green-600' : ''}`}
            >
              {added ? <><Check size={18} /> Added!</> : <><ShoppingCart size={18} /> Add to Cart</>}
            </button>
            <Link href="/cart" className="btn-secondary text-center">
              View Cart
            </Link>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-6">Related Products</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {related.map(p => (
              <Link key={p.id} href={`/products/${p.id}`} className="card hover:shadow-md transition-all group">
                <div className="h-40 overflow-hidden rounded-t-2xl">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-sm line-clamp-2 mb-2">{p.name}</p>
                  <p className="text-brand font-bold">${p.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
