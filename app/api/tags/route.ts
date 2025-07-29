import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const decks = await prisma.deck.findMany({
      select: { tags: true },
    })

    // Get unique tags and sort them
    const allTags = decks.flatMap((deck) => JSON.parse(deck.tags || "[]"))
    const uniqueTags = [...new Set(allTags)].sort()

    return NextResponse.json(uniqueTags)
  } catch (error) {
    console.error("Failed to fetch tags:", error)
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 })
  }
}
