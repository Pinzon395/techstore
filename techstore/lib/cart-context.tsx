'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type CartItem = { id: string; name: string; price: number; image: string; qty: number }
type CartCtx = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'>) => void
  remove: (id: string) => void
  update: (id: string, qty: number) => void
  clear: () => void
  total: number
  count: number
}

const CartContext = createContext<CartCtx>({} as CartCtx)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (saved) setItems(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const add = (item: Omit<CartItem, 'qty'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const remove = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const update = (id: string, qty: number) => {
    if (qty <= 0) return remove(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }
  const clear = () => setItems([])
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, add, remove, update, clear, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
