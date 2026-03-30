# PIBAZAAR_MASTER_BUILD.md

## SECTION 1 — APP OVERVIEW
App name: PiBazaar
Description: Decentralized peer-to-peer marketplace built natively for Pi Network. First full-featured P2P marketplace with Pi coin payments, escrow, KYC, and global shipping logistics.

## SECTION 2 — TECH STACK
Frontend: Next.js 14 with TypeScript
Styling: Tailwind CSS with custom CSS variables for theme switching
Maps: Leaflet.js with React-Leaflet and OpenStreetMap tiles
Real-time: Supabase Realtime for live chat notifications and social feed
Database: Supabase PostgreSQL with Row Level Security
Authentication: Pi SDK for Pi Wallet only — no email no phone
File Storage: Supabase Storage for listing images and user photos
Payments: Pi SDK payment flow with custom escrow logic
State Management: Zustand for global app state
Deployment: Vercel for frontend — fast global CDN
Backend API: Next.js API routes — no separate backend needed
Push Notifications: Web Push API with service workers
Caching: Vercel Edge Cache plus Supabase query caching
Image Optimization: Next.js Image component with lazy loading
CSV Export: Papa Parse library for transaction exports
URL Scraping: Cheerio for eBay Amazon listing import

## SECTION 3 — DESIGN SYSTEM
Background: #0A0A0F
Gold accent: #F0C040
Secondary background: #1A1A2E
Card background: #16213E
Text: #FFFFFF
Subtext: #888888
Success: #22C55E
Error: #EF4444
Font headings: Sora
Font body: DM Sans

## SECTION 4 — CONFIRMED COMPLETED FEATURES
✔ Pi Wallet only login
✔ Bottom navigation HOME BROWSE MAP PROFILE CHAT
✔ TikTok onboarding slides one time for new users
✔ Personalized home feed based on interests
✔ Seasonal banner auto-updates by calendar
✔ Flash deals countdown timer
✔ Top sellers carousel with badges
✔ Explore categories row
✔ Search bar with filters and sorting
✔ Browse listings page
✔ Buy with Pi payment flow
✔ Messaging list UI
✔ Real-time chat with read receipts and typing indicator
✔ Nearby sellers list on MAP tab
✔ Basic seller profiles
✔ Wishlist heart icon
✔ Seller storefronts with follow button
✔ Social proof live feed
✔ Bundle discounts at checkout
✔ Seller analytics dashboard
✔ Listing boost 0.1Pi toggle at checkout
✔ Referral program Pi reward
✔ Fraud detection
✔ Dispute resolution AI chatbot
✔ Notification badges real-time
✔ Seller reputation with photo reviews
✔ Payout buttons 25% 50% 75% Max
✔ Live Leaflet map with gold pins
✔ Post-purchase emoji feedback survey
✔ Escrow protection fee at checkout

## SECTION 5 — KNOWN BUGS TO FIX BEFORE ANYTHING NEW
1. Map fallback UI when location denied — show manual city input
2. Default map center Nassau Bahamas 25.0343 -77.3963
3. Radius slider km label min 1 max 500 with debounce
4. Connect gold pins to real listing data
5. Retry location button when permission denied
6. Blank screen when map fails — show error UI
7. Replace all alert() with real modal UI
8. New message compose Coming Soon — build real screen
9. Seasonal banner not clickable — fix filtering

## SECTION 6 — BUILD QUEUE IN EXACT ORDER
Step 2: Real full-screen chat UI with Supabase Realtime
Step 3: Create listing with drag-drop photos URL import
Step 4: Pi escrow physical and digital products
Step 5: Make Offer flow and order tracking
Step 6: KYC CSV export trending tags gift cards Settings with custom color picker
Step 7: Seller badges price history scheduled listings custom shop themes bulk upload
Step 8: Listing reminders seller suspension chargeback audit shop notifications bundle suggest
Step 9: Infrastructure optimization indexes caching rate limiting load testing

## SECTION 7 — SETTINGS WITH CUSTOM COLOR PICKER
Settings tab includes:
- Privacy controls
- Notification preferences
- Theme selector: Dark Light Sepia PLUS Custom Theme option
- Custom color picker lets users choose: primary background color, gold accent color, card background, text color, subtext color, button colors
- Store all custom colors in Supabase user_preferences table
- Apply custom colors globally using CSS custom variables
- Users can save multiple custom themes and switch between them
- Respect user's color choice even if light theme — never force dark

## SECTION 8 — INFRASTRUCTURE AND SCALABILITY
- Supabase Row Level Security on all tables
- Database indexes on listing category location price
- Vercel Edge caching for home feed top sellers trending
- Supabase Storage with CDN for images
- Next.js API rate limiting 100 requests per minute per user
- Supabase Realtime for live features
- Web Push API service workers for notifications
- Mobile optimized with lazy loading and responsive design
- Load testing k6 targeting 1000 concurrent users

## SECTION 9 — STRICT RULES NEVER BREAK THESE
- Never use alert() anywhere in the app
- No HTML entities in JavaScript or TypeScript
- Use commas not semicolons in font imports
- Dark theme #0A0A0F on default BUT respect user's custom color choice
- No blank screens — show loading skeleton or error boundary
- Never generate Coming Soon — build real feature or remove button
- Fix bugs in Section 5 before starting Section 6
- Test every feature visually before moving to next step
- Never combine steps — one at a time
- Report what was built and what still needs fixing after each step
- TypeScript strict mode enabled
- All Supabase queries typed
- All Pi SDK calls wrapped in try catch
- Never hardcode Pi prices — pull from Pi price API
- All user data saved to Supabase not just localStorage
- Users can customize every color in the app
- Custom colors stored in Supabase and applied globally
- Respect user's color choice always