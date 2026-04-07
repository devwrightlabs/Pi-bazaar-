import { z } from 'zod'

// ─── AI Suggest ───────────────────────────────────────────────
export const AISuggestRequestSchema = z.object({
  title: z.string().min(1, 'title is required').max(200),
  category: z.string().min(1, 'category is required').max(100),
  condition: z.string().min(1, 'condition is required').max(50),
})
export type AISuggestRequestParsed = z.infer<typeof AISuggestRequestSchema>

// ─── Escrow Create ───────────────────────────────────────────
export const EscrowCreateSchema = z.object({
  listing_id: z.string().uuid('listing_id must be a valid UUID'),
  buyer_id: z.string().uuid('buyer_id must be a valid UUID'),
  seller_id: z.string().uuid('seller_id must be a valid UUID'),
  amount_pi: z.number().positive('amount_pi must be positive'),
  product_type: z.enum(['physical', 'digital']),
  pi_payment_id: z.string().min(1, 'pi_payment_id is required'),
  shipping_address_id: z.string().uuid().optional(),
})
export type EscrowCreateParsed = z.infer<typeof EscrowCreateSchema>

// ─── Escrow Ship ─────────────────────────────────────────────
export const EscrowShipSchema = z.object({
  tracking_number: z.string().min(1, 'tracking_number is required').max(200),
  shipping_carrier: z.string().min(1, 'shipping_carrier is required').max(100),
})
export type EscrowShipParsed = z.infer<typeof EscrowShipSchema>

// ─── Escrow Deliver (digital) ────────────────────────────────
export const EscrowDeliverSchema = z.object({
  delivery_proof: z.string().min(1, 'delivery_proof is required').max(5000),
})
export type EscrowDeliverParsed = z.infer<typeof EscrowDeliverSchema>

// ─── Escrow Dispute ──────────────────────────────────────────
export const EscrowDisputeSchema = z.object({
  reason: z.string().min(1, 'reason is required').max(500),
  description: z.string().min(1, 'description is required').max(5000),
  evidence_urls: z
    .array(z.string().url('each evidence_url must be a valid URL'))
    .max(10)
    .optional(),
})
export type EscrowDisputeParsed = z.infer<typeof EscrowDisputeSchema>

// ─── Scrape Listing ──────────────────────────────────────────
export const ScrapeListingSchema = z.object({
  url: z.string().url('url must be a valid URL'),
})
export type ScrapeListingParsed = z.infer<typeof ScrapeListingSchema>

// ─── Recommendations ──────────────────────────────────────────
export const RecommendationRequestSchema = z
  .object({
    user_id: z.string().uuid('user_id must be a valid UUID'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius_km: z.number().min(1).max(500).default(50),
    preferred_categories: z.array(z.string().max(100)).max(20).default([]),
    price_min: z.number().min(0).optional(),
    price_max: z.number().positive().optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    jurisdiction: z.enum(['local', 'global']).optional(),
    origin_country: z
      .string()
      .length(2, 'origin_country must be a 2-letter ISO country code')
      .regex(/^[A-Z]{2}$/, 'origin_country must be a valid uppercase ISO-2 country code')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      typeof data.price_min === 'number' &&
      typeof data.price_max === 'number' &&
      data.price_max < data.price_min
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['price_max'],
        message: 'price_max must be greater than or equal to price_min',
      })
    }
  })
export type RecommendationRequestParsed = z.infer<typeof RecommendationRequestSchema>

// ─── Shared Zod parse helper ─────────────────────────────────
// Returns { success: true, data } or { success: false, error: string }
export function safeParse<T>(schema: z.ZodType<T>, raw: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(raw)
  if (result.success) return { success: true, data: result.data }
  const msg = result.error.issues.map((i) => i.message).join('; ')
  return { success: false, error: msg }
}