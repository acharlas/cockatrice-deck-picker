import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { shuffle } from "lodash"

export async function POST(request: NextRequest) {
  try {
    const { players, bracket, colors } = await request.json()

    // Generate a simple session ID and game ID
    const sessionId = request.headers.get("x-forwarded-for") || "default-session"
    const gameId = Date.now().toString() // Simple game ID based on timestamp

    // Build query filters
    const where: any = {}
    if (bracket) where.bracket = bracket

    // Get all decks matching filters
    let availableDecks = await prisma.deck.findMany({ where })

    // Filter by colors if specified
    if (colors && colors.length > 0) {
      availableDecks = availableDecks.filter((deck) => {
        const deckColors = JSON.parse(deck.colors)
        return colors.some((color: string) => deckColors.includes(color))
      })
    }

    // Get already used decks for this session
    const usedDecks = await prisma.usedDeck.findMany({
      where: { sessionId },
    })
    const usedDeckIds = new Set(usedDecks.map((ud) => ud.deckId))

    // Filter out used decks
    const unusedDecks = availableDecks.filter((deck) => !usedDeckIds.has(deck.id))

    // If not enough unused decks, return error
    if (unusedDecks.length < players.length) {
      return NextResponse.json({ error: "Not enough unused decks available. Try resetting history." }, { status: 400 })
    }

    // Shuffle and take required number
    const shuffledDecks = shuffle(unusedDecks)
    const selectedDecks = shuffledDecks.slice(0, players.length)

    // Create assignment
    const assignment: { [key: string]: any } = {}
    const historyEntries = []

    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const deck = selectedDecks[i]

      assignment[player] = {
        ...deck,
        colors: JSON.parse(deck.colors),
      }

      historyEntries.push({
        sessionId,
        gameId,
        playerName: player,
        deckId: deck.id,
        deckName: deck.name,
      })

      // Create or update used deck entry individually to handle duplicates
      await prisma.usedDeck.upsert({
        where: {
          sessionId_deckId: {
            sessionId,
            deckId: deck.id,
          },
        },
        update: {},
        create: {
          sessionId,
          deckId: deck.id,
        },
      })
    }

    // Save assignment history
    await prisma.assignmentHistory.createMany({
      data: historyEntries,
    })

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error("Assignment failed:", error)
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 })
  }
}
