import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shuffle } from "lodash";
import { colorsMatch, filterDecks, DeckPreferences } from "@/lib/utils";

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
  let remainingDecks = availableDecks.filter((deck) => !usedDeckIds.has(deck.id));

    const assignment: { [key: string]: any } = {};
    const pools: { [key: string]: any[] } = {};

    for (const player of players) {
      const prefs: DeckPreferences = playerPreferences[player];

      const playerPool = filterDecks(remainingDecks, prefs);

      if (playerPool.length === 0) {
        return NextResponse.json(
          {
            error: `No available decks for ${player} with their preferences. Try adjusting preferences or resetting history.`,
          },
          { status: 400 },
        );
      }

      const selectedDeck = shuffle(playerPool)[0];

      assignment[player] = {
        deck: {
          ...selectedDeck,
          colors: JSON.parse(selectedDeck.colors),
        },
      };

      pools[player] = playerPool
        .filter((d) => d.id !== selectedDeck.id)
        .map((d) => ({ ...d, colors: JSON.parse(d.colors) }));

      remainingDecks = remainingDecks.filter((d) => d.id !== selectedDeck.id);
    }

    // NOTE: We don't mark decks as used here - only when finalized
    return NextResponse.json({ assignment, pools });
  } catch (error) {
    console.error("Assignment failed:", error);
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }
}
