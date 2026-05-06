// Clean 404 page matching design system
export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <h1
        className="text-6xl font-bold mb-4"
        style={{ color: 'var(--color-gold)', fontFamily: 'Sora, sans-serif' }}
      >
        404
      </h1>
      <p className="text-lg mb-8" style={{ color: 'var(--color-subtext)' }}>
        This page doesn&apos;t exist yet.
      </p>
      <a
        href="/"
        className="px-6 py-3 rounded-2xl font-semibold"
        style={{
          backgroundColor: 'var(--color-gold)',
          color: '#0A0A0F',
          fontFamily: 'Sora, sans-serif',
        }}
      >
        Back to PiBazaar
      </a>
    </main>
  )
}
