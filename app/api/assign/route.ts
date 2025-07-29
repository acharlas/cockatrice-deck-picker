import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shuffle } from "lodash";

export async function POST(request: NextRequest) {
  try {
    const { players, bracket, playerPreferences } = await request.json();
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

    // Assignment logic - try to match each player's individual preferences
    const assignment: { [key: string]: any } = {};
    const assignedDecks = new Set<string>();

    for (const player of players) {
      const prefs = playerPreferences[player];

      // Start with all unused decks not yet assigned in this session
      let playerDecks = unusedDecks.filter(
        (deck) => !assignedDecks.has(deck.id)
      );

      // Apply player's color preferences (EXCLUSIVE matching)
      if (prefs && prefs.colors.length > 0) {
        const colorFilteredDecks = playerDecks.filter((deck) => {
          const deckColors = JSON.parse(deck.colors);

          // Check if deck colors exactly match the preferred colors
          // Sort both arrays to compare them properly
          const sortedDeckColors = [...deckColors].sort();
          const sortedPrefColors = [...prefs.colors].sort();

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
      if (prefs && prefs.commander && prefs.commander !== "Any commander") {
        const commanderFilteredDecks = playerDecks.filter((deck) =>
          deck.commander.toLowerCase().includes(prefs.commander.toLowerCase())
        );

        // Use commander-filtered decks if available, otherwise fall back to color/all decks
        if (commanderFilteredDecks.length > 0) {
          playerDecks = commanderFilteredDecks;
        }
      }

      // If no decks available for this player, return error
      if (playerDecks.length === 0) {
        return NextResponse.json(
          {
            error: `No available decks for ${player} with their preferences. Try adjusting preferences or resetting history.`,
          },
          { status: 400 }
        );
      }

      // Randomly select a deck for this player
      const selectedDeck = shuffle(playerDecks)[0];
      assignedDecks.add(selectedDeck.id);

      assignment[player] = {
        deck: {
          ...selectedDeck,
          colors: JSON.parse(selectedDeck.colors),
        },
      };
    }

    // NOTE: We don't mark decks as used here - only when finalized
    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Assignment failed:", error);
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }
}
