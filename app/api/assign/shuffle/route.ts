import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shuffle } from "lodash";

export async function POST(request: NextRequest) {
  try {
    const {
      player,
      currentDeckId,
      bracket,
      playerPreferences,
      currentAssignment,
    } = await request.json();
    const sessionId =
      request.headers.get("x-forwarded-for") || "default-session";

    // Build global bracket filter
    const where: any = {};
    if (bracket) where.bracket = bracket;

    // Get all decks matching bracket
    const availableDecks = await prisma.deck.findMany({ where });

    // Get used decks for this session (only finalized assignments count)
    const usedDecks = await prisma.usedDeck.findMany({
      where: { sessionId },
    });
    const usedDeckIds = new Set(usedDecks.map((ud) => ud.deckId));

    // Filter out used decks (only finalized ones)
    const unusedDecks = availableDecks.filter(
      (deck) => !usedDeckIds.has(deck.id)
    );

    // Get currently assigned deck IDs from the current assignment (excluding the current player's deck)
    const currentlyAssignedIds = new Set(
      Object.entries(currentAssignment || {})
        .filter(([assignedPlayer]) => assignedPlayer !== player)
        .map(([, data]: [string, any]) => data.deck.id)
    );

    // Remove the current deck and other currently assigned decks from options
    let playerDecks = unusedDecks.filter(
      (deck) => deck.id !== currentDeckId && !currentlyAssignedIds.has(deck.id)
    );

    // Apply player's color preferences (EXCLUSIVE matching)
    if (playerPreferences && playerPreferences.colors.length > 0) {
      const colorFilteredDecks = playerDecks.filter((deck) => {
        const deckColors = JSON.parse(deck.colors);

        // Check if deck colors exactly match the preferred colors
        // Sort both arrays to compare them properly
        const sortedDeckColors = [...deckColors].sort();
        const sortedPrefColors = [...playerPreferences.colors].sort();
        console.log("sortedDeckColors = " + sortedDeckColors);
        console.log("sortedPrefColors = " + sortedPrefColors);

        return (
          sortedDeckColors.length === sortedPrefColors.length &&
          sortedDeckColors.every(
            (color, index) => color === sortedPrefColors[index]
          )
        );
      });

      // Use color-filtered decks if available, otherwise fall back to all decks
      if (colorFilteredDecks.length > 0) {
        playerDecks = colorFilteredDecks;
      }
    }

    // Apply player's commander preference
    if (
      playerPreferences &&
      playerPreferences.commander &&
      playerPreferences.commander !== "Any commander"
    ) {
      const commanderFilteredDecks = playerDecks.filter((deck) =>
        deck.commander
          .toLowerCase()
          .includes(playerPreferences.commander.toLowerCase())
      );

      // Use commander-filtered decks if available, otherwise fall back to color/all decks
      if (commanderFilteredDecks.length > 0) {
        playerDecks = commanderFilteredDecks;
      }
    }

    // If no other decks available, return error
    if (playerDecks.length === 0) {
      return NextResponse.json(
        { error: "No other decks available for this player." },
        { status: 400 }
      );
    }

    // Randomly select a new deck
    const selectedDeck = shuffle(playerDecks)[0];

    // NOTE: We don't update used deck records here - only when finalized
    return NextResponse.json({
      deck: {
        ...selectedDeck,
        colors: JSON.parse(selectedDeck.colors),
      },
    });
  } catch (error) {
    console.error("Shuffle failed:", error);
    return NextResponse.json({ error: "Shuffle failed" }, { status: 500 });
  }
}
