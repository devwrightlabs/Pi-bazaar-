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
Validation: Zod for all runtime input validation on client and server

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

## SECTION 10 — ZERO-CRASH INFRASTRUCTURE

This section is MANDATORY. No new feature development may proceed until the codebase fully complies with every rule below. These are non-negotiable stability requirements.

### Rule 1 — React Error Boundaries on Every Component
- Every page-level component MUST be wrapped in the shared ErrorBoundary component
- Every complex child component (map, chat, forms, payment flows) MUST have its own ErrorBoundary wrapper
- ErrorBoundary MUST render a styled fallback UI matching the dark theme — never a blank screen
- ErrorBoundary MUST include a retry or reload action button
- The global layout (RootLayout) MUST wrap {children} in a top-level ErrorBoundary as a final safety net
- Components that fetch data or use browser APIs (geolocation, Pi SDK, WebSocket) are HIGH PRIORITY for individual boundaries

### Rule 2 — Strict Row Level Security (RLS) on All Supabase Tables
- Every Supabase table MUST have RLS enabled — no exceptions
- Every table MUST have explicit SELECT INSERT UPDATE DELETE policies — never rely on default allow
- Users MUST only be able to read their own private data (messages, orders, addresses, payment records)
- Users MUST only be able to update or delete their own records
- Listings can be publicly readable but only editable by the seller who created them
- Escrow transactions MUST only be accessible to the buyer and seller involved
- Admin-only tables (disputes, fraud flags) MUST restrict access to service role only
- All RLS policies MUST be documented in a SUPABASE_RLS_POLICIES.md file in the repo root

### Rule 3 — Zod Validation on All Inputs
- Every API route that accepts a request body MUST validate it with a Zod schema before processing
- Every client-side form MUST validate inputs with Zod before submission
- Zod schemas MUST be defined in a shared file: src/lib/schemas.ts
- Schemas MUST match the TypeScript interfaces in types.ts — single source of truth
- Validation errors MUST be surfaced to the user via styled inline error messages — never console.log only
- URL parameters and query strings in API routes MUST be validated with Zod
- All Zod schemas MUST be exported and reusable between client and server

### Rule 4 — Pi SDK Try-Catch with User-Friendly UI Fallbacks
- Every Pi SDK call (authenticate, createPayment, openShareDialog) MUST be wrapped in try-catch
- On Pi SDK failure the app MUST show a user-friendly error via GlobalModal — never console.error only
- If Pi SDK is not available (window.Pi is undefined) the app MUST show a graceful fallback UI explaining the user needs the Pi Browser
- Payment failures MUST show a retry option with clear messaging about what went wrong
- Authentication failures MUST redirect to a styled error state — never a blank screen or silent failure
- All Pi SDK error handling MUST be centralized in src/lib/pi-sdk.ts — no raw Pi SDK calls anywhere else in the codebase
- The pi-sdk.ts wrapper MUST return typed results with explicit error states that callers can handle in their UI