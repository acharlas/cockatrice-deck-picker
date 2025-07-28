"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PLAYERS } from "@/lib/players"
import { COLOR_OPTIONS } from "@/lib/constants"
import { Shuffle, Home, Copy } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface Deck {
  id: string
  name: string
  bracket: number
  colors: string[]
  commander: string
  deckList: string
}

interface Assignment {
  [playerName: string]: {
    deck: Deck
  }
}

interface PlayerPreferences {
  [playerName: string]: {
    colors: string[]
    commander: string
  }
}


export default function AssignPage() {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(PLAYERS)
  const [bracketFilter, setBracketFilter] = useState<number | null>(null)
  const [playerPreferences, setPlayerPreferences] = useState<PlayerPreferences>(() => {
    const initial: PlayerPreferences = {}
    PLAYERS.forEach((player) => {
      initial[player] = { colors: [], commander: "" }
    })
    return initial
  })
  const [availableCommanders, setAvailableCommanders] = useState<string[]>([])
  const [matchingCount, setMatchingCount] = useState(0)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Fetch available commanders from decks
  useEffect(() => {
    fetchAvailableCommanders()
  }, [])

  // Update matching count when filters change
  useEffect(() => {
    updateMatchingCount()
  }, [selectedPlayers, bracketFilter, playerPreferences])

  const fetchAvailableCommanders = async () => {
    try {
      const response = await fetch("/api/decks/commanders")
      const data = await response.json()
      setAvailableCommanders(data.commanders || [])
    } catch (error) {
      console.error("Failed to fetch commanders:", error)
    }
  }

  const updateMatchingCount = async () => {
    try {
      const params = new URLSearchParams()
      if (bracketFilter) params.append("bracket", bracketFilter.toString())

      // Collect all unique colors from selected players
      const allColors = new Set<string>()
      selectedPlayers.forEach((player) => {
        playerPreferences[player].colors.forEach((color) => allColors.add(color))
      })
      if (allColors.size > 0) params.append("colors", Array.from(allColors).join(","))

      // Collect all unique commanders from selected players
      const allCommanders = new Set<string>()
      selectedPlayers.forEach((player) => {
        if (playerPreferences[player].commander) {
          allCommanders.add(playerPreferences[player].commander)
        }
      })
      if (allCommanders.size > 0) params.append("commanders", Array.from(allCommanders).join(","))

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

  const handlePlayerColorToggle = (player: string, color: string) => {
    setPlayerPreferences((prev) => ({
      ...prev,
      [player]: {
        ...prev[player],
        colors: prev[player].colors.includes(color)
          ? prev[player].colors.filter((c) => c !== color)
          : [...prev[player].colors, color],
      },
    }))
  }

  const handlePlayerCommanderChange = (player: string, commander: string) => {
    setPlayerPreferences((prev) => ({
      ...prev,
      [player]: {
        ...prev[player],
        commander: commander,
      },
    }))
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
          playerPreferences: Object.fromEntries(selectedPlayers.map((player) => [player, playerPreferences[player]])),
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setAssignment(data.assignment)
        toast({
          title: "Assignment Complete",
          description: `Successfully assigned decks to ${selectedPlayers.length} players!`,
          variant: "success",
        })
      } else {
        toast({
          title: "Assignment Failed",
          description: data.error || "Assignment failed. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Assignment failed:", error)
      toast({
        title: "Assignment Failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyDeckList = async (deckList: string, deckName: string) => {
    try {
      await navigator.clipboard.writeText(deckList)
      toast({
        title: "Copied!",
        description: `Deck list for "${deckName}" copied to clipboard.`,
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy deck list to clipboard.",
        variant: "destructive",
      })
    }
  }

  const finalizeAssignment = async () => {
    if (!assignment) return

    try {
      const response = await fetch("/api/assign/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment: Object.entries(assignment).map(([player, data]) => ({
            player,
            deckId: data.deck.id,
            deckName: data.deck.name,
            commander: data.deck.commander,
          })),
        }),
      })

      if (response.ok) {
        toast({
          title: "Assignment Finalized",
          description: "Assignment has been saved to history!",
          variant: "success",
        })
      }
    } catch (error) {
      console.error("Failed to finalize assignment:", error)
    }
  }

  const canAssign = selectedPlayers.length > 0 && matchingCount >= selectedPlayers.length

  const getFilteredCommanders = (query: string) => {
    return availableCommanders.filter((commander) => commander.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
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
          {/* Global Bracket Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Global Filter</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Player Selection & Individual Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Players & Individual Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {PLAYERS.map((player) => (
                <div key={player} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={player}
                      checked={selectedPlayers.includes(player)}
                      onCheckedChange={() => handlePlayerToggle(player)}
                    />
                    <label htmlFor={player} className="font-medium text-lg">
                      {player}
                    </label>
                  </div>

                  {selectedPlayers.includes(player) && (
                    <>
                      {/* Individual Color Preferences */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Preferred Colors</label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_OPTIONS.map((color) => (
                            <Button
                              key={color}
                              type="button"
                              variant={playerPreferences[player].colors.includes(color) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePlayerColorToggle(player, color)}
                            >
                              {color}
                            </Button>
                          ))}
                        </div>
                        {playerPreferences[player].colors.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">No color preference (any color)</p>
                        )}
                      </div>

                      {/* Individual Commander Preference */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Preferred Commander</label>
                        <div className="relative">
                          <Input
                            value={playerPreferences[player].commander}
                            onChange={(e) => handlePlayerCommanderChange(player, e.target.value)}
                            placeholder="Search for a commander..."
                          />
                          {playerPreferences[player].commander &&
                            getFilteredCommanders(playerPreferences[player].commander).length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                {getFilteredCommanders(playerPreferences[player].commander).map((commander) => (
                                  <div
                                    key={commander}
                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handlePlayerCommanderChange(player, commander)}
                                  >
                                    {commander}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                        {playerPreferences[player].commander && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 bg-transparent"
                            onClick={() => handlePlayerCommanderChange(player, "")}
                          >
                            Clear Commander
                          </Button>
                        )}
                        {!playerPreferences[player].commander && (
                          <p className="text-xs text-gray-500 mt-1">No commander preference (any commander)</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Assignment Button */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">{matchingCount} decks available</div>
                <div className="text-sm text-gray-600 mb-4">{selectedPlayers.length} players selected</div>

                {!canAssign && matchingCount === 0 && (
                  <div className="text-red-600 mb-4">No decks match the current preferences</div>
                )}

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

        {/* Assignment Results */}
        <div>
          {assignment && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(assignment).map(([player, data]) => (
                  <div key={player} className="p-4 border rounded-lg space-y-3">
                    <div className="font-semibold text-lg">{player}</div>
                    <div className="font-medium">{data.deck.name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">Bracket {data.deck.bracket}</span>
                      {data.deck.commander && <span className="text-sm">Commander: {data.deck.commander}</span>}
                      <div className="flex gap-1">
                        {data.deck.colors.map((color) => (
                          <Badge key={color} variant="secondary" className="text-xs">
                            {color}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Show if preferences were matched */}
                    <div className="text-xs text-gray-600">
                      {playerPreferences[player].colors.length > 0 &&
                        playerPreferences[player].colors.some((color) => data.deck.colors.includes(color)) && (
                          <div className="text-green-600">✓ Matched color preference</div>
                        )}
                      {playerPreferences[player].commander &&
                        data.deck.commander === playerPreferences[player].commander && (
                          <div className="text-green-600">✓ Matched commander preference</div>
                        )}
                    </div>

                    {data.deck.deckList && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyDeckList(data.deck.deckList, data.deck.name)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Deck List
                      </Button>
                    )}
                  </div>
                ))}

                <div className="pt-4">
                  <Button onClick={finalizeAssignment} className="w-full">
                    Finalize Assignment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
