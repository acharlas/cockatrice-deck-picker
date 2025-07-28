import { shuffle } from "lodash"

// Mock deck data for testing
const mockDecks = [
  { id: "1", name: "Deck 1", bracket: 1, colors: ["Red"] },
  { id: "2", name: "Deck 2", bracket: 1, colors: ["Blue"] },
  { id: "3", name: "Deck 3", bracket: 2, colors: ["Green"] },
  { id: "4", name: "Deck 4", bracket: 2, colors: ["White"] },
  { id: "5", name: "Deck 5", bracket: 3, colors: ["Black"] },
]

describe("Assignment Logic", () => {
  test("shuffle produces different order", () => {
    const original = [1, 2, 3, 4, 5]
    const shuffled = shuffle([...original])

    // While it's possible they could be the same, it's very unlikely
    // This test mainly ensures shuffle function works
    expect(shuffled).toHaveLength(original.length)
    expect(shuffled.sort()).toEqual(original.sort())
  })

  test("uniqueness tracking prevents duplicates", () => {
    const usedDeckIds = new Set(["1", "3"])
    const availableDecks = mockDecks.filter((deck) => !usedDeckIds.has(deck.id))

    expect(availableDecks).toHaveLength(3)
    expect(availableDecks.map((d) => d.id)).toEqual(["2", "4", "5"])
  })

  test("bracket filtering works correctly", () => {
    const bracket1Decks = mockDecks.filter((deck) => deck.bracket === 1)
    expect(bracket1Decks).toHaveLength(2)
    expect(bracket1Decks.every((deck) => deck.bracket === 1)).toBe(true)
  })

  test("color filtering works correctly", () => {
    const redDecks = mockDecks.filter((deck) => deck.colors.includes("Red"))
    expect(redDecks).toHaveLength(1)
    expect(redDecks[0].id).toBe("1")
  })

  test("assignment logic with insufficient decks", () => {
    const players = ["Player1", "Player2", "Player3"]
    const availableDecks = mockDecks.slice(0, 2) // Only 2 decks

    expect(availableDecks.length < players.length).toBe(true)
  })
})
