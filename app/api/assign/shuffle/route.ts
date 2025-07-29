import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shuffle } from "lodash";
import { colorsMatch, filterDecks, DeckPreferences } from "@/lib/utils";

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

    const prefs: DeckPreferences = playerPreferences;
    let playerDecks = filterDecks(unusedDecks, prefs);

    playerDecks = playerDecks.filter(
      (deck) => deck.id !== currentDeckId && !currentlyAssignedIds.has(deck.id),
    );

    // If no other decks available, return error
    if (playerDecks.length === 0) {
      return NextResponse.json(
        { error: "No other decks available for this player." },
        { status: 400 }
      );
    }

    const selectedDeck = shuffle(playerDecks)[0];

    const remaining = playerDecks
      .filter((d) => d.id !== selectedDeck.id)
      .map((d) => ({ ...d, colors: JSON.parse(d.colors) }));

    return NextResponse.json({
      deck: {
        ...selectedDeck,
        colors: JSON.parse(selectedDeck.colors),
      },
      pool: remaining,
    });
  } catch (error) {
    console.error("Shuffle failed:", error);
    return NextResponse.json({ error: "Shuffle failed" }, { status: 500 });
  }
}
