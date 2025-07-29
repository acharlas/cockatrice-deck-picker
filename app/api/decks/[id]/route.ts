import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, colors, commander, bracket, tags, deckList } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Deck name is required" }, { status: 400 })
    }

    if (!commander || !commander.trim()) {
      return NextResponse.json({ error: "Commander is required" }, { status: 400 })
    }

    if (!colors || colors.length === 0) {
      return NextResponse.json({ error: "At least one color is required" }, { status: 400 })
    }

    if (!bracket || bracket < 1 || bracket > 5) {
      return NextResponse.json({ error: "Bracket must be between 1 and 5" }, { status: 400 })
    }

    const deck = await prisma.deck.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        colors: JSON.stringify(colors),
        commander: commander.trim(),
        bracket: Number.parseInt(bracket),
        tags: JSON.stringify(tags || []),
        deckList: deckList || "",
      },
    })

    return NextResponse.json({
      ...deck,
      colors: JSON.parse(deck.colors),
      tags: JSON.parse(deck.tags || "[]"),
    })
  } catch (error) {
    console.error("Failed to update deck:", error)
    return NextResponse.json({ error: "Failed to update deck" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.deck.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete deck:", error)
    return NextResponse.json({ error: "Failed to delete deck" }, { status: 500 })
  }
}
