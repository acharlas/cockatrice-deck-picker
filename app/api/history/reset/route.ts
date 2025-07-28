import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const sessionId = request.headers.get("x-forwarded-for") || "default-session"

    // Clear used decks for this session
    await prisma.usedDeck.deleteMany({
      where: { sessionId },
    })

    // Optionally clear assignment history too
    await prisma.assignmentHistory.deleteMany({
      where: { sessionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to reset history:", error)
    return NextResponse.json({ error: "Failed to reset history" }, { status: 500 })
  }
}
