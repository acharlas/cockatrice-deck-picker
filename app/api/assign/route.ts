import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { shuffle } from "lodash"

export async function POST(request: NextRequest) {
  try {
    const { players, playerPreferences, bracket, globalTags } = await request.json()
    const sessionId = request.headers.get("x-forwarded-for") || "default-session"

    // Get all decks
    let availableDecks = await prisma.deck.findMany()

    // Filter by bracket first (global filter)
    if (bracket && bracket >= 1 && bracket <= 5) {
      availableDecks = availableDecks.filter((deck) => deck.bracket === bracket)
    }

    // Filter by global tags
    if (globalTags && globalTags.length > 0) {
      availableDecks = availableDecks.filter((deck) => {
        const deckTags = JSON.parse(deck.tags || "[]")
        return globalTags.every((tag: string) => deckTags.includes(tag))
      })
    }

    // Get used decks for this session (only finalized assignments count)
    const usedDecks = await prisma.usedDeck.findMany({
      where: { sessionId },
    })
    const usedDeckIds = new Set(usedDecks.map((ud) => ud.deckId))

    // Filter out used decks (only finalized ones)
    const unusedDecks = availableDecks.filter((deck) => !usedDeckIds.has(deck.id))

    // Assignment logic - try to match each player's individual preferences
    const assignment: { [key: string]: any } = {}
    const assignedDecks = new Set<string>()

    for (const player of players) {
      const prefs = playerPreferences[player]

      // Start with all unused decks not yet assigned in this session
      let playerDecks = unusedDecks.filter((deck) => !assignedDecks.has(deck.id))

      // Apply player's tag preferences
      if (prefs && prefs.tags && prefs.tags.length > 0) {
        const tagFilteredDecks = playerDecks.filter((deck) => {
          const deckTags = JSON.parse(deck.tags || "[]")
          return prefs.tags.every((tag: string) => deckTags.includes(tag))
        })

        if (tagFilteredDecks.length > 0) {
          playerDecks = tagFilteredDecks
        } else {
          return NextResponse.json(
            {
              error: `No decks for ${player} with tags: ${prefs.tags.join(", ")}`,
            },
            { status: 400 },
          )
        }
      }

      // Apply player's color preferences (EXACT matching)
      if (prefs && prefs.colors.length > 0) {
        const colorFilteredDecks = playerDecks.filter((deck) => {
          const deckColors = JSON.parse(deck.colors).sort()
          const prefColors = [...prefs.colors].sort()

          // Check if deck colors exactly match the preferred colors
          return (
            deckColors.length === prefColors.length &&
            deckColors.every((color: string, index: number) => color === prefColors[index])
          )
        })

        // Use color-filtered decks if available, otherwise return error
        if (colorFilteredDecks.length > 0) {
          playerDecks = colorFilteredDecks
        } else if (prefs.colors.length > 0) {
          return NextResponse.json(
            {
              error: `No decks for ${player} with colors: ${prefs.colors.join(" + ")}`,
            },
            { status: 400 },
          )
        }
      }

      // Apply player's commander preference
      if (prefs && prefs.commander && prefs.commander !== "") {
        const commanderFilteredDecks = playerDecks.filter((deck) => deck.commander === prefs.commander)

        // Use commander-filtered decks if available, otherwise return error
        if (commanderFilteredDecks.length > 0) {
          playerDecks = commanderFilteredDecks
        } else {
          return NextResponse.json(
            {
              error: `No decks for ${player} with commander: ${prefs.commander}`,
            },
            { status: 400 },
          )
        }
      }

      // If no decks available for this player, return error
      if (playerDecks.length === 0) {
        return NextResponse.json(
          {
            error: `No decks available for ${player}`,
          },
          { status: 400 },
        )
      }

      // Randomly select a deck for this player
      const selectedDeck = shuffle(playerDecks)[0]
      assignedDecks.add(selectedDeck.id)

      assignment[player] = {
        deck: {
          ...selectedDeck,
          colors: JSON.parse(selectedDeck.colors),
          tags: JSON.parse(selectedDeck.tags || "[]"),
        },
      }
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error("Assignment failed:", error)
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 })
  }
}
