import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { assignment } = await request.json()
    const sessionId = request.headers.get("x-forwarded-for") || "default-session"
    const gameId = Date.now().toString()

    // Save assignment to history
    for (const entry of assignment) {
      const { player, deckId, deckName, commander } = entry

      await prisma.assignmentHistory.create({
        data: {
          sessionId,
          gameId,
          playerName: player,
          deckId,
          deckName,
          commander: commander || "",
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to finalize assignment:", error)
    return NextResponse.json({ error: "Failed to finalize assignment" }, { status: 500 })
  }
}
