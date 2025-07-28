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
      commander: deck.commander || "",
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

    const deck = await prisma.deck.create({
      data: {
        name,
        bracket,
        colors: JSON.stringify(colors),
        commander: commander || "",
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
