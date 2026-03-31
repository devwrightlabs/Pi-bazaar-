'use client'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function FastSellerAgreement({ checked, onChange }: Props) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer p-4 rounded-xl"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className="w-5 h-5 rounded flex items-center justify-center border-2 transition-colors"
          style={{
            backgroundColor: checked ? 'var(--color-gold)' : 'transparent',
            borderColor: checked ? 'var(--color-gold)' : 'rgba(136,136,136,0.5)',
          }}
        >
          {checked && <span className="text-black text-xs font-bold">&#10003;</span>}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          Fast Seller Agreement
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-subtext)' }}>
          I agree to respond to buyer inquiries within 24 hours, ship or fulfill within 3 days of
          payment, accurately represent the item as described and shown, and honor all accepted
          offers. I understand that failure to comply may result in account restrictions.
        </p>
      </div>
    </label>
  )
}
