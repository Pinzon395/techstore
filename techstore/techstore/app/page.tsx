'use client'
import { useState } from 'react'
import Link from 'next/link'
import { products, categories } from '@/lib/products'
import { useCart } from '@/lib/cart-context'
import { ShoppingCart, Star, Zap, Shield, Truck, Headphones } from 'lucide-react'
import Image from 'next/image'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} className={i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </div>
  )
}

function ProductCard({ product }: { product: typeof products[0] }) {
  const { add } = useCart()
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0

  return (
    <div className="card hover:shadow-md transition-all group">
      <Link href={`/products/${product.id}`}>
        <div className="relative overflow-hidden rounded-t-2xl bg-gray-50 h-48">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discount > 0 && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
              -{discount}%
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <p className="text-xs text-brand font-medium mb-1">{product.category}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-900 hover:text-brand transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={product.rating} />
          <span className="text-xs text-gray-400">({product.reviews})</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-gray-900">${product.price.toLocaleString()}</span>
            {product.oldPrice && (
              <span className="text-sm text-gray-400 line-through ml-2">${product.oldPrice.toLocaleString()}</span>
            )}
          </div>
          <button
            onClick={() => add({ id: product.id, name: product.name, price: product.price, image: product.image })}
            className="p-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-all active:scale-95"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div>
      {/* HERO */}
      <section className="bg-gradient-to-br from-brand to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6">
              <Zap size={14} className="text-yellow-300" /> Best prices in tech
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Your Next PC,<br />
              <span className="text-blue-200">Built to Perform.</span>
            </h1>
            <p className="text-blue-100 text-lg mb-8">
              Custom PCs, workstations, and tech solutions for gamers, creators, and businesses.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a href="#products" className="bg-white text-brand font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-all">
                Shop Now
              </a>
              <a
                href="https://instagram.com/YOUR_INSTAGRAM"
                target="_blank"
                rel="noopener"
                className="border border-white/30 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
              >
                Follow us
              </a>
            </div>
          </div>
          <div className="hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800"
              alt="Gaming PC"
              className="rounded-2xl shadow-2xl object-cover h-80 w-full"
            />
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Truck, label: 'Free Shipping', sub: 'On orders over $500' },
            { icon: Shield, label: '2-Year Warranty', sub: 'All products covered' },
            { icon: Headphones, label: 'Expert Support', sub: 'Mon-Sat 9AM-6PM' },
            { icon: Zap, label: 'Fast Build', sub: '3-5 business days' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="p-2.5 bg-brand/10 rounded-xl">
                <Icon size={20} className="text-brand" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Our Products</h2>
            <p className="text-gray-400 text-sm mt-1">{filtered.length} products found</p>
          </div>
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input max-w-xs"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-brand hover:text-brand'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No products found for "{search}"</p>
          </div>
        )}
      </section>

      {/* CTA CONTACT */}
      <section className="bg-gray-900 text-white mx-4 sm:mx-6 lg:mx-8 rounded-3xl mb-16 p-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Need a Custom Build?</h2>
        <p className="text-gray-300 mb-8 max-w-xl mx-auto">
          We build custom PCs, repair computers, and provide IT services for businesses and individuals.
          Get in touch — first consultation is free.
        </p>
        <a
          href="https://wa.me/YOUR_PHONE?text=Hi! I need a custom PC build."
          target="_blank"
          rel="noopener"
          className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-xl transition-all text-lg"
        >
          WhatsApp Us
        </a>
      </section>
    </div>
  )
}
