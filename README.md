# 🍔 Lash Burger & Pizza — Digital Menu System

A complete digital restaurant management system with customer menu, admin dashboard, waiter ordering, and kitchen display.

🌐 **Live:** [https://lash-cafe.netlify.app](https://lash-cafe.netlify.app)

---

## ✨ Features

### 🍽️ Customer Side
- 📱 **QR Code Access** — Scan and browse, no app needed
- 🌍 **Multilingual** — English, Amharic (አማርኛ), Afaan Oromoo
- 🔍 **Search & Filter** — Find items by name, ingredients, or price
- 📂 **Category Navigation** — Breakfast, Burger, Pizza, Sandwich, Chicken, Fish, Rice, Pasta, Salad, Hot Drinks, Juice, Soft Drinks
- ⚡ **Real-time Updates** — Menu changes appear instantly without refreshing
- 📶 **Offline Support** — Service worker caches content for offline viewing
- 📲 **PWA Ready** — Installable as a mobile app

### 🔐 Admin Dashboard
- 🔑 **Secure Login** — Owner-only access with Supabase authentication
- ➕ **Full CRUD** — Create, Read, Update, Delete menu items
- 📁 **Category Management** — Add, rename, delete categories
- 🖼️ **Image Upload** — Upload food photos or paste image URLs
- ✏️ **Partial Updates** — Change just the price without re-uploading everything
- 🔄 **Real-time Sync** — Changes reflect instantly on the customer page
- 🔍 **Search Items** — Quick search across all menu items

### 🧑‍💼 Waiter Panel
- 🪑 **Table Selection** — Choose table number for each order
- 📋 **Menu Browsing** — Browse full menu and add items to order
- 📝 **Special Notes** — Add notes for kitchen (allergies, preferences)
- 🚀 **Send to Kitchen** — Submit orders directly to kitchen display
- 📊 **Order Tracking** — Track order status in real-time
- 🕐 **Recent Orders** — View order history

### 👨‍🍳 Kitchen Display
- 📺 **Real-time Orders** — Orders appear instantly from waiter panel
- 🔔 **Sound Notifications** — Audio alert for new incoming orders
- 🎨 **Color-coded Status** — Visual status (Pending → Preparing → Ready → Served)
- ✅ **Status Management** — Update order progress with one click
- 🔄 **Auto-refresh** — Orders update automatically

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend / Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Authentication | Supabase Auth |
| Image Storage | Supabase Storage |
| Real-time Updates | Supabase Realtime |
| Hosting | [Netlify](https://netlify.com) |
| PWA | Service Worker + Manifest |