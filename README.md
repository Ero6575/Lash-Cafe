# ☕ Lash Café — Digital Hotel Menu

A modern, multilingual digital restaurant menu system. Customers scan a QR code to browse the menu on their phone. The restaurant owner manages everything through a secure admin dashboard — no app downloads required.

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Cost](https://img.shields.io/badge/hosting-free-blue)
![Languages](https://img.shields.io/badge/languages-EN%20|%20AM%20|%20OM-orange)

---

## ✨ Features

### Customer Side
- 📱 **QR Code Access** — Scan and browse, no app needed
- 🌍 **Multilingual** — English, Amharic (አማርኛ), Afaan Oromoo
- 🔍 **Search & Filter** — Find items by name, ingredients, or price
- 📂 **Category Navigation** — Breakfast, Burger, Pizza, Sandwich, Chicken, Fish, Rice, Pasta, Salad, Hot Drinks, Juice, Soft Drinks
- ⚡ **Real-time Updates** — Menu changes appear instantly without refreshing
- 📶 **Offline Support** — Service worker caches content for offline viewing
- 📲 **PWA Ready** — Installable as a mobile app

### Admin Dashboard
- 🔐 **Secure Login** — Owner-only access, no public registration
- ➕ **Full CRUD** — Create, Read, Update, Delete menu items
- 📁 **Category Management** — Add, rename, delete categories
- 🖼️ **Image Upload** — Upload food photos or paste image URLs
- ✏️ **Partial Updates** — Change just the price without re-uploading everything
- 🔄 **Real-time Sync** — Changes reflect instantly on the customer page
- 🔍 **Search Items** — Quick search across all menu items

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Auth | Supabase Authentication |
| Storage | Supabase Storage (food images) |
| Real-time | Supabase Realtime (PostgreSQL Changes) |
| Hosting | [Netlify](https://netlify.com) (Free tier) |
| Offline | Service Worker + Cache API |




