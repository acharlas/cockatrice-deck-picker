import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const decks = await prisma.deck.findMany({
      select: {
        commander: true,
      },
    })

    // Get unique commanders, filter out empty ones
    const commanders = [
      ...new Set(decks.map((deck) => deck.commander).filter((commander) => commander && commander.trim())),
    ].sort()

    return NextResponse.json({ commanders })
  } catch (error) {
    console.error("Failed to fetch commanders:", error)
    return NextResponse.json({ error: "Failed to fetch commanders" }, { status: 500 })
  }
}
