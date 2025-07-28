import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const decks = await prisma.deck.findMany({
      select: {
        commander: true,
        deckList: true,
      },
    });

    const commandersSet = new Set<string>();

    decks.forEach((deck) => {
      // Add default commander if it exists
      if (deck.commander && deck.commander.trim()) {
        commandersSet.add(deck.commander.trim());
      }

      // Parse deck list for additional commanders
      if (deck.deckList) {
        const lines = deck.deckList.split("\n");
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          // Look for lines that start with "1 " (typical commander format)
          const commanderMatch = trimmed.match(/^1\s+(.+)$/);
          if (commanderMatch) {
            const cardName = commanderMatch[1].trim();
            // Filter out basic lands and common non-commander cards
            if (
              !cardName.match(/^(Plains|Island|Swamp|Mountain|Forest)$/i) &&
              !cardName.match(
                /^(Sol Ring|Command Tower|Arcane Signet|Lightning Greaves|Swiftfoot Boots)$/i
              )
            ) {
              commandersSet.add(cardName);
            }
          }
        });
      }
    });

    const commanders = Array.from(commandersSet).sort();

    return NextResponse.json({ commanders });
  } catch (error) {
    console.error("Failed to fetch commanders:", error);
    return NextResponse.json(
      { error: "Failed to fetch commanders" },
      { status: 500 }
    );
  }
}
