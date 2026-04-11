export type Product = {
  id: string; name: string; price: number; oldPrice?: number
  image: string; category: string; rating: number; reviews: number
  description: string; specs: Record<string, string>
}

export const products: Product[] = [
  {
    id: '1', name: 'Gaming PC Pro RTX 4070', price: 1299, oldPrice: 1599,
    image: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=600',
    category: 'Gaming PCs', rating: 4.8, reviews: 124,
    description: 'High-performance gaming PC with RTX 4070, perfect for 1440p gaming at max settings.',
    specs: { CPU: 'Intel Core i7-13700K', GPU: 'RTX 4070 12GB', RAM: '32GB DDR5', Storage: '1TB NVMe SSD', PSU: '750W 80+ Gold' }
  },
  {
    id: '2', name: 'Office Workstation i5', price: 649, oldPrice: 799,
    image: 'https://images.unsplash.com/photo-1593640408182-31c228c1cc57?w=600',
    category: 'Office PCs', rating: 4.6, reviews: 89,
    description: 'Reliable workstation for productivity, multitasking, and office work.',
    specs: { CPU: 'Intel Core i5-13400', GPU: 'Intel UHD 730', RAM: '16GB DDR4', Storage: '512GB SSD', PSU: '500W 80+ Bronze' }
  },
  {
    id: '3', name: 'Creator Studio RTX 4080', price: 2199, oldPrice: 2499,
    image: 'https://images.unsplash.com/photo-1624705013726-8c4bf10d97c0?w=600',
    category: 'Workstations', rating: 4.9, reviews: 56,
    description: 'Professional workstation for 3D rendering, video editing, and creative work.',
    specs: { CPU: 'AMD Ryzen 9 7900X', GPU: 'RTX 4080 16GB', RAM: '64GB DDR5', Storage: '2TB NVMe SSD', PSU: '850W 80+ Platinum' }
  },
  {
    id: '4', name: 'Mini PC Business Pro', price: 399, oldPrice: 499,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    category: 'Mini PCs', rating: 4.5, reviews: 203,
    description: 'Compact and powerful mini PC, perfect for home office or reception desks.',
    specs: { CPU: 'Intel Core i3-1315U', GPU: 'Intel Iris Xe', RAM: '8GB DDR4', Storage: '256GB SSD', PSU: 'External 65W' }
  },
  {
    id: '5', name: 'Budget Gaming Rig RX 7600', price: 849,
    image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600',
    category: 'Gaming PCs', rating: 4.4, reviews: 178,
    description: 'Best bang-for-buck gaming PC for 1080p gaming on a budget.',
    specs: { CPU: 'AMD Ryzen 5 7600', GPU: 'RX 7600 8GB', RAM: '16GB DDR5', Storage: '500GB NVMe SSD', PSU: '650W 80+ Gold' }
  },
  {
    id: '6', name: 'Server Tower Xeon', price: 1899,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
    category: 'Servers', rating: 4.7, reviews: 34,
    description: 'Enterprise-grade server tower for small businesses and development teams.',
    specs: { CPU: 'Intel Xeon E-2378', GPU: 'None (headless)', RAM: '32GB ECC DDR4', Storage: '2x 2TB SATA', PSU: '500W Redundant' }
  },
]

export const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))]
