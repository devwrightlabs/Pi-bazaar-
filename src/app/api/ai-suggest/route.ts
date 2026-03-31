import { NextRequest, NextResponse } from 'next/server'
import type { AISuggestRequest, AISuggestResponse } from '@/lib/types'

// Template-based description generator.
// Easy to swap in OpenAI/Anthropic by replacing `generateDescription` below.
function generateDescription(title: string, category: string, condition: string): string {
  const conditionText: Record<string, string> = {
    new: 'brand new and unused',
    like_new: 'in like-new condition with minimal signs of use',
    good: 'in good condition with normal wear',
    fair: 'in fair condition — functional with visible wear',
  }
  const conditionDesc = conditionText[condition] ?? `in ${condition} condition`

  const categoryIntro: Record<string, string> = {
    Electronics: 'This electronic item',
    Clothing: 'This clothing item',
    'Home & Garden': 'This home and garden item',
    Sports: 'This sports item',
    Toys: 'This toy',
    Books: 'This book',
    Automotive: 'This automotive item',
    Art: 'This piece of art',
    Collectibles: 'This collectible',
    Music: 'This music item',
    Jewelry: 'This piece of jewelry',
    'Health & Beauty': 'This health and beauty item',
    'Food & Drink': 'This food and drink item',
    Services: 'This service',
    Other: 'This item',
  }
  const intro = categoryIntro[category] ?? 'This item'

  return (
    `${intro} — "${title}" — is ${conditionDesc}. ` +
    `Listed on PiBazaar for the Pi Network community. ` +
    `Please review all photos carefully before purchasing. ` +
    `Payment is accepted in Pi (Pi Network). ` +
    `Feel free to send a message if you have any questions about this listing. ` +
    `All sales are final unless the item is significantly not as described.`
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AISuggestRequest>
    const { title, category, condition } = body

    if (!title || !category || !condition) {
      return NextResponse.json(
        { error: 'title, category, and condition are required' },
        { status: 400 }
      )
    }

    const description = generateDescription(title.trim(), category.trim(), condition.trim())
    return NextResponse.json({ description } satisfies AISuggestResponse)
  } catch {
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 })
  }
}
