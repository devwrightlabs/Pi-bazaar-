import { create } from 'zustand'
import type { Listing, Conversation, Message, UserProfile, EscrowTransaction, ShippingAddress, EscrowTimelineEvent } from '@/lib/types'

interface AppState {
  // Auth
  currentUser: UserProfile | null
  isAuthenticated: boolean
  setCurrentUser: (user: UserProfile | null) => void

  // Listings
  listings: Listing[]
  setListings: (listings: Listing[]) => void

  // Chat
  conversations: Conversation[]
  setConversations: (conversations: Conversation[]) => void
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  messages: Record<string, Message[]>
  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (conversationId: string, message: Message) => void

  // Map
  userLocation: [number, number] | null
  setUserLocation: (location: [number, number] | null) => void
  mapRadius: number
  setMapRadius: (radius: number) => void

  // Escrow / Orders
  escrowTransactions: EscrowTransaction[]
  setEscrowTransactions: (txns: EscrowTransaction[]) => void
  currentOrder: (EscrowTransaction & { timeline: EscrowTimelineEvent[] }) | null
  setCurrentOrder: (order: (EscrowTransaction & { timeline: EscrowTimelineEvent[] }) | null) => void
  shippingAddresses: ShippingAddress[]
  setShippingAddresses: (addresses: ShippingAddress[]) => void
  fetchOrders: (userId: string) => Promise<void>
  fetchOrderDetail: (orderId: string) => Promise<void>
  createEscrow: (payload: {
    listing_id: string
    buyer_id: string
    seller_id: string
    amount_pi: number
    product_type: 'physical' | 'digital'
    pi_payment_id: string
    shipping_address_id?: string
  }) => Promise<EscrowTransaction | null>
  confirmReceipt: (orderId: string) => Promise<boolean>
  openDispute: (orderId: string, reason: string, description: string, evidence_urls?: string[]) => Promise<boolean>

  // UI
  modalOpen: boolean
  modalConfig: {
    title: string
    message: string
    variant: 'alert' | 'confirm' | 'info'
    onConfirm?: () => void
    onCancel?: () => void
  } | null
  openModal: (config: AppState['modalConfig']) => void
  closeModal: () => void

  // Theme
  themeVars: Record<string, string>
  setThemeVars: (vars: Record<string, string>) => void
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: user !== null }),

  listings: [],
  setListings: (listings) => set({ listings }),

  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  messages: {},
  setMessages: (conversationId, messages) =>
    set((state) => ({ messages: { ...state.messages, [conversationId]: messages } })),
  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),
  mapRadius: 50,
  setMapRadius: (radius) => set({ mapRadius: radius }),

  // Escrow
  escrowTransactions: [],
  setEscrowTransactions: (txns) => set({ escrowTransactions: txns }),
  currentOrder: null,
  setCurrentOrder: (order) => set({ currentOrder: order }),
  shippingAddresses: [],
  setShippingAddresses: (addresses) => set({ shippingAddresses: addresses }),

  fetchOrders: async (userId: string) => {
    try {
      const res = await fetch(`/api/escrow?userId=${encodeURIComponent(userId)}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      const data = (await res.json()) as EscrowTransaction[]
      set({ escrowTransactions: data })
    } catch (err) {
      console.error('fetchOrders error:', err)
    }
  },

  fetchOrderDetail: async (orderId: string) => {
    try {
      const res = await fetch(`/api/escrow/${encodeURIComponent(orderId)}`)
      if (!res.ok) throw new Error('Failed to fetch order detail')
      const data = (await res.json()) as EscrowTransaction & { timeline: EscrowTimelineEvent[] }
      set({ currentOrder: data })
    } catch (err) {
      console.error('fetchOrderDetail error:', err)
    }
  },

  createEscrow: async (payload) => {
    try {
      const res = await fetch('/api/escrow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create escrow')
      return (await res.json()) as EscrowTransaction
    } catch (err) {
      console.error('createEscrow error:', err)
      return null
    }
  },

  confirmReceipt: async (orderId: string) => {
    try {
      const res = await fetch(`/api/escrow/${encodeURIComponent(orderId)}/confirm`, { method: 'POST' })
      return res.ok
    } catch (err) {
      console.error('confirmReceipt error:', err)
      return false
    }
  },

  openDispute: async (orderId: string, reason: string, description: string, evidence_urls?: string[]) => {
    try {
      const res = await fetch(`/api/escrow/${encodeURIComponent(orderId)}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, description, evidence_urls }),
      })
      return res.ok
    } catch (err) {
      console.error('openDispute error:', err)
      return false
    }
  },

  modalOpen: false,
  modalConfig: null,
  openModal: (config) => set({ modalOpen: true, modalConfig: config }),
  closeModal: () => set({ modalOpen: false, modalConfig: null }),

  themeVars: {},
  setThemeVars: (vars) => set({ themeVars: vars }),
}))

