import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bracket = searchParams.get("bracket")
    const colors = searchParams.get("colors")

    const where: any = {}

    if (bracket) {
      where.bracket = Number.parseInt(bracket)
    }

    if (colors) {
      const colorArray = colors.split(",")
      // For SQLite, we need to use string operations to check JSON array
      where.colors = {
        contains: colorArray[0], // Simplified - in production you'd want better JSON querying
      }
    }

    const count = await prisma.deck.count({ where })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Failed to count decks:", error)
    return NextResponse.json({ error: "Failed to count decks" }, { status: 500 })
  }
}
