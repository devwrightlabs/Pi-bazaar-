# Pi-bazaar
Here is your complete README.md to copy and paste:

# PiBazaar 🛒

**The first decentralized peer-to-peer marketplace built natively for Pi Network.**

Buy and sell anything with Pi coin — physical products, digital goods, and services — with full escrow protection, real-time chat, and global shipping logistics.

---

## 🚀 What is PiBazaar?

PiBazaar is a full-featured P2P marketplace ecosystem built inside Pi Browser for the Pi Network community. Think Facebook Marketplace meets eBay — but decentralized, blockchain-powered, and running entirely on Pi coin.

---

## ✨ Features

### 🔐 Authentication
- Pi Wallet only login — no email, no phone, no Google
- Single verified identity tied to your Pi account
- Pi Verified badge on all seller profiles

### 🏠 Home Feed
- Personalized feed based on your interests
- Seasonal banners that auto-update by calendar date
- Flash deals with live countdown timers
- Top sellers carousel with Champion badges
- Trending search tags updated in real time

### 🗺️ Map & Location
- Live Leaflet map with gold seller pins
- Locate Me GPS button with Nassau Bahamas default
- Radius slider 1 to 500 km with mobile debounce
- Location fallback UI with manual city input
- Retry location button when permission denied

### 💬 Real-Time Chat
- Full screen chat UI with Supabase Realtime
- Message bubbles with timestamps
- Read receipts and typing indicators
- New message compose with Pi username search
- Conversation list with unread badges

### 📦 Listings
- Drag and drop photo upload up to 10 photos
- Pi price with live USD equivalent
- Category, condition, description fields
- Location auto-filled from profile
- Allow offers toggle
- Fast seller agreement checkbox
- AI description suggestion
- Live card preview before posting
- URL import scrapes eBay and Amazon listings

### 💰 Payments & Escrow
- Pi SDK payment flow
- Physical products: carrier selection, tracking number required before escrow releases
- Digital products: file or link upload as proof
- Buyer confirms receipt to release funds
- 7 day dispute window with fund freeze
- Post-purchase 1 to 5 star review prompt
- Trust Score increases with every completed sale
- Payout buttons 25% 50% 75% Max based on real balance

### 🤝 Offers & Orders
- Make Offer button alongside Buy Now
- Seller accepts, counters, or declines
- Negotiation tracked in chat thread
- Order tracking with real-time status steps
- Payment Confirmed, Seller Packing, Shipped, Delivered

### 💖 Wishlist & Discovery
- Heart icon saves listings to Supabase
- Notifications when similar items are listed
- Seller storefronts with follow button
- Social proof live feed showing recent sales
- Bundle discounts at checkout

### 📊 Seller Tools
- Analytics dashboard with click-through rate and conversion rate
- Peak sales times and best performing listings
- Listing boost for 0.1 Pi to push to top of feed
- Referral program Pi reward on first purchase
- Fraud detection flagging suspicious accounts
- Seller response time SLA on profile
- Transaction CSV export for accounting
- KYC optional identity verification for Trusted badge

### ⚙️ Settings
- Privacy controls and notification preferences
- Theme selector: Dark, Light, Sepia
- Custom color picker for every UI element
- All preferences stored in Supabase

### 🛡️ Trust & Safety
- Dispute resolution AI chatbot with step-by-step guidance
- Seller auto-suspend below 3 star average or fraud flags
- Chargeback protection with full escrow audit trail
- Real-time notification badges for messages, offers, listings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15.5.14 with TypeScript |
| Styling | Tailwind CSS with CSS custom properties |
| Maps | Leaflet.js with React-Leaflet |
| Database | Supabase PostgreSQL with Row Level Security |
| Real-time | Supabase Realtime |
| Auth | Pi SDK — Pi Wallet only |
| Storage | Supabase Storage for images |
| State | Zustand |
| Deployment | Vercel |
| Notifications | Web Push API with service workers |

---

## 🎨 Design System



Background:   #0A0A0F
Gold Accent:  #F0C040
Secondary BG: #1A1A2E
Cards:        #16213E
Text:         #FFFFFF
Subtext:      #888888
Success:      #22C55E
Error:        #EF4444
Font Heading: Sora
Font Body:    DM Sans


---

## 📁 Project Structure



src/
├── app/
│   ├── page.tsx              # Home feed
│   ├── browse/               # Browse listings
│   ├── map/                  # Map view
│   ├── chat/                 # Messaging
│   ├── profile/              # User profile
│   ├── listings/create/      # Create listing
│   └── settings/             # User settings
├── components/
│   ├── MapWrapper.tsx        # Map orchestrator
│   ├── MapBase.tsx           # Leaflet map component
│   ├── MapErrorBoundary.tsx  # Map error handling
│   ├── ChatBubble.tsx        # Chat message bubbles
│   ├── ChatInput.tsx         # Chat input field
│   ├── TypingIndicator.tsx   # Typing indicator
│   ├── ReadReceipt.tsx       # Read receipts
│   ├── SeasonalBanner.tsx    # Auto-updating banner
│   └── GlobalModal.tsx       # App-wide modal system
├── lib/
│   └── supabase.ts           # Supabase client
└── store/
└── index.ts              # Zustand global state


---

## 🚦 Getting Started

### Prerequisites
- Node.js 18 or higher
- A Supabase account
- A Pi Developer account
- A Vercel account

### Installation

```bash
git clone https://github.com/devwrightlabs/Pibazaar.git
cd Pibazaar
npm install


Environment Variables
Create a .env.local file in the root:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_PI_APP_ID=your_pi_app_id
NEXT_PUBLIC_PI_SANDBOX=true


Development

npm run dev


Open http://localhost:3000 in your browser.
Production Build

npm run build
npm start


🌐 Deployment
PiBazaar is optimized for deployment on Vercel.
	1.	Push your code to GitHub
	2.	Import the repository on vercel.com
	3.	Add your environment variables in the Vercel dashboard
	4.	Deploy — Vercel handles everything automatically

🗺️ Roadmap
	∙	Pi Wallet authentication
	∙	Home feed with seasonal banners and flash deals
	∙	Live Leaflet map with gold pins and location detection
	∙	Real-time chat with read receipts and typing indicators
	∙	Create listing with drag-drop photos and URL import
	∙	Pi escrow for physical and digital products
	∙	Make Offer flow and order tracking
	∙	KYC verification and custom shop themes
	∙	Seller badge milestones and price history
	∙	Scheduled listings and bulk upload
	∙	MainNet launch

🤝 Contributing
PiBazaar is currently in private beta. Contributions will be open after MainNet launch.

⚖️ Legal
All transactions on PiBazaar are peer-to-peer. Sellers are responsible for shipping costs and delivery from their jurisdiction. PiBazaar operates as a marketplace platform only and is not responsible for individual transactions. See our Terms of Service and Buyer Protection policy within the app for full details.

📬 Contact
Built by @beejayy223 on Pi Network.
Pi Username: @beejayy223

PiBazaar — The Pi Network Marketplace 🛒 
