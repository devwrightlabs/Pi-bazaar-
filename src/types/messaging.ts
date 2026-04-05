export interface MessageRecord {
  id: string
  sender_id: string
  receiver_id: string
  product_id: string | null
  content: string
  is_read: boolean
  created_at: string
}

export interface SendMessageRequest {
  receiver_id: string
  content: string
  product_id?: string
}

export interface ConversationResponse {
  messages: MessageRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface ReviewRecord {
  id: string
  reviewer_id: string
  reviewee_id: string
  escrow_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface SubmitReviewRequest {
  escrow_id: string
  rating: number
  comment?: string
}

export interface SubmitReviewResponse {
  review: ReviewRecord
  seller_trust_score: number
  seller_total_sales: number
}

export interface UserReviewsResponse {
  reviews: ReviewRecord[]
  trust_score: number
  total_sales: number
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}
