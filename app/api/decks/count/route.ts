import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bracket = searchParams.get("bracket")
    const colors = searchParams.get("colors")
    const commanders = searchParams.get("commanders")

    const where: any = {}

    if (bracket) {
      where.bracket = Number.parseInt(bracket)
    }

    let decks = await prisma.deck.findMany({ where })

    // Filter by colors (if any player has color preferences)
    if (colors) {
      const colorArray = colors.split(",")
      decks = decks.filter((deck) => {
        const deckColors = JSON.parse(deck.colors)
        return colorArray.some((color) => deckColors.includes(color))
      })
    }

    // Filter by commanders (if any player has commander preferences)
    if (commanders) {
      const commanderArray = commanders.split(",")
      decks = decks.filter((deck) => {
        return commanderArray.includes(deck.commander)
      })
    }

    return NextResponse.json({ count: decks.length })
  } catch (error) {
    console.error("Failed to count decks:", error)
    return NextResponse.json({ error: "Failed to count decks" }, { status: 500 })
  }
}
