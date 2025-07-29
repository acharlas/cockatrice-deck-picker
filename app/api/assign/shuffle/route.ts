import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { shuffle } from "lodash"

export async function POST(request: NextRequest) {
  try {
    const { player, currentDeckId, playerPreferences, currentAssignment, bracket, globalTags } = await request.json()
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

    // Get currently assigned deck IDs from the current assignment (excluding the current player's deck)
    const currentlyAssignedIds = new Set(
      Object.entries(currentAssignment || {})
        .filter(([assignedPlayer]) => assignedPlayer !== player)
        .map(([, data]: [string, any]) => data.deck.id),
    )

    // Remove the current deck and other currently assigned decks from options
    let playerDecks = unusedDecks.filter((deck) => deck.id !== currentDeckId && !currentlyAssignedIds.has(deck.id))

    // Apply player's tag preferences
    if (playerPreferences && playerPreferences.tags && playerPreferences.tags.length > 0) {
      const tagFilteredDecks = playerDecks.filter((deck) => {
        const deckTags = JSON.parse(deck.tags || "[]")
        return playerPreferences.tags.every((tag: string) => deckTags.includes(tag))
      })

      if (tagFilteredDecks.length > 0) {
        playerDecks = tagFilteredDecks
      }
    }

    // Apply player's color preferences (EXACT matching)
    if (playerPreferences && playerPreferences.colors.length > 0) {
      const colorFilteredDecks = playerDecks.filter((deck) => {
        const deckColors = JSON.parse(deck.colors).sort()
        const prefColors = [...playerPreferences.colors].sort()

        // Check if deck colors exactly match the preferred colors
        return (
          deckColors.length === prefColors.length &&
          deckColors.every((color: string, index: number) => color === prefColors[index])
        )
      })

      // Use color-filtered decks if available
      if (colorFilteredDecks.length > 0) {
        playerDecks = colorFilteredDecks
      }
    }

    // Apply player's commander preference
    if (playerPreferences && playerPreferences.commander && playerPreferences.commander !== "") {
      const commanderFilteredDecks = playerDecks.filter((deck) => deck.commander === playerPreferences.commander)

      // Use commander-filtered decks if available
      if (commanderFilteredDecks.length > 0) {
        playerDecks = commanderFilteredDecks
      }
    }

    // If no other decks available, return error
    if (playerDecks.length === 0) {
      return NextResponse.json({ error: "No other decks available" }, { status: 400 })
    }

    // Randomly select a new deck
    const selectedDeck = shuffle(playerDecks)[0]

    return NextResponse.json({
      deck: {
        ...selectedDeck,
        colors: JSON.parse(selectedDeck.colors),
        tags: JSON.parse(selectedDeck.tags || "[]"),
      },
    })
  } catch (error) {
    console.error("Shuffle failed:", error)
    return NextResponse.json({ error: "Shuffle failed" }, { status: 500 })
  }
}
