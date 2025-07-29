import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bracket = searchParams.get("bracket");
    const colors = searchParams.get("colors");
    const sessionId =
      request.headers.get("x-forwarded-for") || "default-session";

    const where: any = {};

    if (bracket) {
      where.bracket = Number.parseInt(bracket);
    }

    let decks = await prisma.deck.findMany({ where });

    // Get used decks for this session (only finalized assignments count)
    const usedDecks = await prisma.usedDeck.findMany({
      where: { sessionId },
    });
    const usedDeckIds = new Set(usedDecks.map((ud) => ud.deckId));

    // Filter out used decks (only finalized ones)
    decks = decks.filter((deck) => !usedDeckIds.has(deck.id));

    // Filter by colors (EXCLUSIVE matching - if any player has color preferences)
    if (colors) {
      const colorArray = colors.split(",");
      decks = decks.filter((deck) => {
        const deckColors = JSON.parse(deck.colors);

        // Check if deck colors exactly match any of the preferred color combinations
        // Sort both arrays to compare them properly
        const sortedDeckColors = [...deckColors].sort();
        return colorArray.some((color) => {
          const singleColorArray = [color];
          return sortedDeckColors.length === 1 && sortedDeckColors[0] === color;
        });
      });
    }

    return NextResponse.json({ count: decks.length });
  } catch (error) {
    console.error("Failed to count decks:", error);
    return NextResponse.json(
      { error: "Failed to count decks" },
      { status: 500 }
    );
  }
}
