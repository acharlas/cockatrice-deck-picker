import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const colors = searchParams.get("colors")
    const commander = searchParams.get("commander")
    const bracket = searchParams.get("bracket")
    const tags = searchParams.get("tags")
    const sessionId = request.headers.get("x-forwarded-for") || "default-session"

    let decks = await prisma.deck.findMany()

    // Get used decks for this session (only finalized assignments count)
    const usedDecks = await prisma.usedDeck.findMany({
      where: { sessionId },
    })
    const usedDeckIds = new Set(usedDecks.map((ud) => ud.deckId))

    // Filter out used decks (only finalized ones)
    decks = decks.filter((deck) => !usedDeckIds.has(deck.id))

    // Filter by bracket
    if (bracket && bracket !== "") {
      const bracketNum = Number.parseInt(bracket)
      if (bracketNum >= 1 && bracketNum <= 5) {
        decks = decks.filter((deck) => deck.bracket === bracketNum)
      }
    }

    // Filter by tags
    if (tags && tags !== "") {
      const tagArray = tags.split(",")
      decks = decks.filter((deck) => {
        const deckTags = JSON.parse(deck.tags || "[]")
        return tagArray.every((tag) => deckTags.includes(tag))
      })
    }

    // Filter by exact color combination
    if (colors) {
      const colorArray = colors.split(",").sort()
      decks = decks.filter((deck) => {
        const deckColors = JSON.parse(deck.colors).sort()
        return (
          deckColors.length === colorArray.length &&
          deckColors.every((color: string, index: number) => color === colorArray[index])
        )
      })
    }

    // Filter by commander
    if (commander && commander !== "") {
      decks = decks.filter((deck) => deck.commander === commander)
    }

    return NextResponse.json({ count: decks.length })
  } catch (error) {
    console.error("Failed to count decks:", error)
    return NextResponse.json({ error: "Failed to count decks" }, { status: 500 })
  }
}
