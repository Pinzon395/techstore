# TechStore — Setup Guide

## Run in 5 minutes

### 1. Install dependencies
```bash
npm install
```

### 2. Setup Firebase (FREE)
1. Go to https://console.firebase.google.com
2. Click "Create a project" → name it "techstore"
3. Go to **Authentication** → Get Started → Enable:
   - Email/Password
   - Google
4. Go to **Firestore Database** → Create database → Start in test mode
5. Go to **Project Settings** (gear icon) → Your apps → Web app → Copy the config

### 3. Create your .env.local file
```bash
cp .env.example .env.local
```
Then paste your Firebase values into `.env.local`

### 4. Run locally
```bash
npm run dev
```
Open http://localhost:3000 ✅

---

## Deploy to Vercel (FREE)
1. Push this folder to GitHub
2. Go to https://vercel.com → Import your repo
3. Add your `.env.local` values in Vercel → Settings → Environment Variables
4. Click Deploy ✅

---

## Customize
- **Products**: Edit `lib/products.ts` — change names, prices, images
- **Instagram**: Search `YOUR_INSTAGRAM` → replace with your handle
- **WhatsApp**: Search `YOUR_PHONE` → replace with your number (e.g. 521234567890)
- **Brand name**: Search `TechStore` → replace with your brand
- **Colors**: Edit `tailwind.config.js` → change the `brand` color hex

---

## Tech Stack (all FREE)
- Next.js 14 — React framework
- Firebase Auth — Login with email + Google
- Firestore — Database for users
- Tailwind CSS — Styling
- Vercel — Hosting
