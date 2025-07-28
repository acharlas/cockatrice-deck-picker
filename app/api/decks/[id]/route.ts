import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, bracket, colors, deckList } = await request.json()

    const deck = await prisma.deck.update({
      where: { id: params.id },
      data: {
        name,
        bracket,
        colors: JSON.stringify(colors),
        deckList: deckList || "",
      },
    })

    return NextResponse.json({
      ...deck,
      colors: JSON.parse(deck.colors),
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
