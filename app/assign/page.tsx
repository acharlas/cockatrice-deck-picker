"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PLAYERS } from "@/lib/players"
import { Shuffle, Home, Copy } from "lucide-react"
import Link from "next/link"

interface Deck {
  id: string
  name: string
  bracket: number
  colors: string[]
  deckList?: string
}

interface Assignment {
  [playerName: string]: Deck
}

const COLOR_OPTIONS = ["White", "Blue", "Black", "Red", "Green", "Colorless"]

export default function AssignPage() {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(PLAYERS)
  const [bracketFilter, setBracketFilter] = useState<number | null>(null)
  const [colorFilters, setColorFilters] = useState<string[]>([])
  const [matchingCount, setMatchingCount] = useState(0)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    updateMatchingCount()
  }, [selectedPlayers, bracketFilter, colorFilters])

  const updateMatchingCount = async () => {
    try {
      const params = new URLSearchParams()
      if (bracketFilter) params.append("bracket", bracketFilter.toString())
      if (colorFilters.length > 0) params.append("colors", colorFilters.join(","))

      const response = await fetch(`/api/decks/count?${params}`)
      const data = await response.json()
      setMatchingCount(data.count)
    } catch (error) {
      console.error("Failed to get deck count:", error)
      setMatchingCount(0)
    }
  }

  const handlePlayerToggle = (player: string) => {
    setSelectedPlayers((prev) => (prev.includes(player) ? prev.filter((p) => p !== player) : [...prev, player]))
  }

  const handleColorToggle = (color: string) => {
    setColorFilters((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]))
  }

  const handleAssign = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: selectedPlayers,
          bracket: bracketFilter,
          colors: colorFilters,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setAssignment(data.assignment)
      } else {
        alert(data.error || "Assignment failed")
      }
    } catch (error) {
      console.error("Assignment failed:", error)
      alert("Assignment failed")
    } finally {
      setLoading(false)
    }
  }

  const canAssign = selectedPlayers.length > 0 && matchingCount >= selectedPlayers.length

  const copyDeckList = async (deckList: string, deckName: string) => {
    try {
      await navigator.clipboard.writeText(deckList)
      alert(`Copied deck list for "${deckName}" to clipboard!`)
    } catch (error) {
      console.error("Failed to copy:", error)
      alert("Failed to copy deck list")
    }
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Deck Assignment</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Players</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PLAYERS.map((player) => (
                <div key={player} className="flex items-center space-x-2">
                  <Checkbox
                    id={player}
                    checked={selectedPlayers.includes(player)}
                    onCheckedChange={() => handlePlayerToggle(player)}
                  />
                  <label htmlFor={player} className="font-medium">
                    {player}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bracket Level</label>
                <Select
                  value={bracketFilter?.toString() || "0"}
                  onValueChange={(value) => setBracketFilter(value ? Number.parseInt(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any bracket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any bracket</SelectItem>
                    {[1, 2, 3, 4, 5].map((bracket) => (
                      <SelectItem key={bracket} value={bracket.toString()}>
                        Bracket {bracket}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Colors</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant={colorFilters.includes(color) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleColorToggle(color)}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">{matchingCount} decks match these filters</div>
                <div className="text-sm text-gray-600 mb-4">{selectedPlayers.length} players selected</div>

                {!canAssign && matchingCount === 0 && <div className="text-red-600 mb-4">No decks available</div>}

                {!canAssign && matchingCount > 0 && matchingCount < selectedPlayers.length && (
                  <div className="text-red-600 mb-4">Not enough decks for selected players</div>
                )}

                <Button onClick={handleAssign} disabled={!canAssign || loading} size="lg" className="w-full">
                  <Shuffle className="w-4 h-4 mr-2" />
                  {loading ? "Assigning..." : "Assign Decks"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          {assignment && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(assignment).map(([player, deck]) => (
                  <div key={player} className="p-4 border rounded-lg">
                    <div className="font-semibold text-lg">{player}</div>
                    <div className="font-medium">{deck.name}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm">Bracket {deck.bracket}</span>
                      <div className="flex gap-1">
                        {deck.colors.map((color) => (
                          <Badge key={color} variant="secondary" className="text-xs">
                            {color}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {deck.deckList && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 bg-transparent"
                        onClick={() => copyDeckList(deck.deckList, deck.name)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Deck List
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
