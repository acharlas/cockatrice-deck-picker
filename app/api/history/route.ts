import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const sessionId = request.headers.get("x-forwarded-for") || "default-session"

    const history = await prisma.assignmentHistory.findMany({
      where: { sessionId },
      orderBy: { assignedAt: "desc" },
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error("Failed to fetch history:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
