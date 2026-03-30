'use client'

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2">
      <div
        className="px-4 py-3 rounded-2xl"
        style={{ backgroundColor: 'var(--color-card-bg)', borderBottomLeftRadius: '4px' }}
      >
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: 'var(--color-subtext)',
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
