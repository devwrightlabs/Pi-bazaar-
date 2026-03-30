'use client'

import { useState } from 'react'
import type { ShippingAddress } from '@/lib/types'

interface ShippingAddressFormProps {
  savedAddresses?: ShippingAddress[]
  onAddressSelected: (address: Omit<ShippingAddress, 'id' | 'user_id' | 'created_at'>) => void
}

const EMPTY_ADDRESS: Omit<ShippingAddress, 'id' | 'user_id' | 'created_at'> = {
  full_name: '',
  address_line_1: '',
  address_line_2: null,
  city: '',
  state_province: '',
  postal_code: '',
  country: '',
  phone: null,
  is_default: false,
}

export default function ShippingAddressForm({ savedAddresses = [], onAddressSelected }: ShippingAddressFormProps) {
  const [mode, setMode] = useState<'saved' | 'new'>(savedAddresses.length > 0 ? 'saved' : 'new')
  const [form, setForm] = useState(EMPTY_ADDRESS)

  const inputStyle = {
    backgroundColor: '#0A0A0F',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
  }

  const handleSavedSelect = (addr: ShippingAddress) => {
    onAddressSelected({
      full_name: addr.full_name,
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2,
      city: addr.city,
      state_province: addr.state_province,
      postal_code: addr.postal_code,
      country: addr.country,
      phone: addr.phone,
      is_default: addr.is_default,
    })
  }

  const handleSubmit = () => {
    onAddressSelected(form)
  }

  return (
    <div className="space-y-4">
      {savedAddresses.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('saved')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: mode === 'saved' ? '#F0C040' : '#16213E',
              color: mode === 'saved' ? '#000' : '#fff',
            }}
          >
            Saved Addresses
          </button>
          <button
            onClick={() => setMode('new')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: mode === 'new' ? '#F0C040' : '#16213E',
              color: mode === 'new' ? '#000' : '#fff',
            }}
          >
            New Address
          </button>
        </div>
      )}

      {mode === 'saved' && savedAddresses.length > 0 ? (
        <div className="space-y-2">
          {savedAddresses.map((addr) => (
            <button
              key={addr.id}
              onClick={() => handleSavedSelect(addr)}
              className="w-full rounded-xl p-3 text-left text-sm"
              style={{ backgroundColor: '#16213E', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
            >
              <p className="font-medium">{addr.full_name}</p>
              <p style={{ color: '#888' }}>{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
              <p style={{ color: '#888' }}>{addr.city}, {addr.state_province} {addr.postal_code}, {addr.country}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {([
            ['full_name', 'Full Name', 'text'],
            ['address_line_1', 'Address Line 1', 'text'],
            ['address_line_2', 'Address Line 2 (optional)', 'text'],
            ['city', 'City', 'text'],
            ['state_province', 'State / Province', 'text'],
            ['postal_code', 'Postal Code', 'text'],
            ['country', 'Country', 'text'],
            ['phone', 'Phone (optional)', 'tel'],
          ] as [keyof typeof form, string, string][]).map(([field, label, type]) => (
            <div key={field}>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>{label}</label>
              <input
                type={type}
                value={(form[field] ?? '') as string}
                onChange={(e) => setForm({ ...form, [field]: e.target.value || (field === 'address_line_2' || field === 'phone' ? null : '') })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#888' }}>
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="rounded"
            />
            Save as default address
          </label>
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: '#F0C040', color: '#000' }}
          >
            Use This Address
          </button>
        </div>
      )}
    </div>
  )
}
