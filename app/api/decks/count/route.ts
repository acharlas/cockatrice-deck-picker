import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { colorsMatch } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bracket = searchParams.get("bracket");
    const colors = searchParams.get("colors");
    const commander = searchParams.get("commander");
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

    // Filter by colors (EXCLUSIVE matching)
    if (colors) {
      const prefColors = colors.split(",");
      decks = decks.filter((deck) =>
        colorsMatch(JSON.parse(deck.colors), prefColors)
      );
    }

    // Filter by commander name
    if (commander && commander !== "Any commander") {
      decks = decks.filter((deck) =>
        deck.commander.toLowerCase().includes(commander.toLowerCase())
      );
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
