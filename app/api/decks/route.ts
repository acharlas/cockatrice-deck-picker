import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const decks = await prisma.deck.findMany({
      orderBy: { createdAt: "desc" },
    })

    const formattedDecks = decks.map((deck) => ({
      ...deck,
      colors: JSON.parse(deck.colors),
      commander: deck.commander,
      deckList: deck.deckList || "",
    }))

    return NextResponse.json(formattedDecks)
  } catch (error) {
    console.error("Failed to fetch decks:", error)
    return NextResponse.json({ error: "Failed to fetch decks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, bracket, colors, commander, deckList } = await request.json()

    if (!commander || !commander.trim()) {
      return NextResponse.json({ error: "Commander is required" }, { status: 400 })
    }

    if (!colors || colors.length === 0) {
      return NextResponse.json({ error: "At least one color is required" }, { status: 400 })
    }

    if (!bracket || bracket < 1 || bracket > 5) {
      return NextResponse.json({ error: "Bracket must be between 1 and 5" }, { status: 400 })
    }

    const deck = await prisma.deck.create({
      data: {
        name,
        bracket,
        colors: JSON.stringify(colors),
        commander: commander.trim(),
        deckList: deckList || "",
      },
    })

    return NextResponse.json({
      ...deck,
      colors: JSON.parse(deck.colors),
    })
  } catch (error) {
    console.error("Failed to create deck:", error)
    return NextResponse.json({ error: "Failed to create deck" }, { status: 500 })
  }
}
