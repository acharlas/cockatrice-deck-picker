import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { shuffle } from "lodash"

export async function POST(request: NextRequest) {
  try {
    const { players, bracket, playerPreferences } = await request.json()

    const sessionId = request.headers.get("x-forwarded-for") || "default-session"
    const gameId = Date.now().toString()

    const where: any = {}
    if (bracket) where.bracket = bracket

    let decks = await prisma.deck.findMany({ where })

    // Parse colors JSON
    const formattedDecks = decks.map((deck) => ({
      ...deck,
      colors: JSON.parse(deck.colors) as string[],
    }))

    // Filter out decks already used this session
    const usedDecks = await prisma.usedDeck.findMany({ where: { sessionId } })
    const usedIds = new Set(usedDecks.map((d) => d.deckId))
    let availableDecks = formattedDecks.filter((deck) => !usedIds.has(deck.id))

    availableDecks = shuffle(availableDecks)

    const assignment: { [key: string]: any } = {}
    const historyEntries = [] as any[]

    for (const player of players as string[]) {
      const pref = playerPreferences?.[player] || { colors: [], commander: "" }
      const deckIndex = availableDecks.findIndex((deck) => {
        const commanderMatch = pref.commander
          ? deck.commander === pref.commander
          : true
        const colorMatch =
          pref.colors && pref.colors.length > 0
            ? pref.colors.some((c: string) => deck.colors.includes(c))
            : true
        return commanderMatch && colorMatch
      })

      if (deckIndex === -1) {
        return NextResponse.json(
          { error: "Not enough decks available for the given preferences." },
          { status: 400 }
        )
      }

      const deck = availableDecks.splice(deckIndex, 1)[0]

      assignment[player] = { deck }
      historyEntries.push({
        sessionId,
        gameId,
        playerName: player,
        deckId: deck.id,
        deckName: deck.name,
        commander: deck.commander || "",
      })

      await prisma.usedDeck.upsert({
        where: {
          sessionId_deckId: { sessionId, deckId: deck.id },
        },
        update: {},
        create: { sessionId, deckId: deck.id },
      })
    }

    await prisma.assignmentHistory.createMany({ data: historyEntries })

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error("Assignment failed:", error)
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 })
  }
}
