"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { CommanderCombobox } from "@/app/ownCompo/commander-combobox"
import { TagCombobox } from "@/app/ownCompo/tag-combobox"
import { PLAYERS, COLOR_OPTIONS, BRACKET_OPTIONS } from "@/lib/constants"
import { Shuffle, Home, Copy, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Deck {
  id: string
  name: string
  colors: string[]
  commander: string
  bracket: number
  tags: string[]
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
    tags: string[]
  }
}

export default function AssignPage() {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(PLAYERS)
  const [commanders, setCommanders] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [bracket, setBracket] = useState<number | null>(null)
  const [globalTags, setGlobalTags] = useState<string[]>([])
  const [playerPreferences, setPlayerPreferences] = useState<PlayerPreferences>(() => {
    const initial: PlayerPreferences = {}
    PLAYERS.forEach((player) => {
      initial[player] = { colors: [], commander: "", tags: [] }
    })
    return initial
  })
  const [playerDeckCounts, setPlayerDeckCounts] = useState<{ [key: string]: number }>({})
  const [totalDeckCount, setTotalDeckCount] = useState<number>(0)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(false)
  const [shufflingPlayer, setShufflingPlayer] = useState<string | null>(null)

  useEffect(() => {
    fetchCommanders()
    fetchTags()
  }, [])

  useEffect(() => {
    updateDeckCounts()
  }, [selectedPlayers, playerPreferences, bracket, globalTags])

  const fetchCommanders = async () => {
    try {
      const response = await fetch("/api/commanders")
      const data = await response.json()
      setCommanders(data)
    } catch (error) {
      console.error("Failed to fetch commanders:", error)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags")
      const data = await response.json()
      setTags(data)
    } catch (error) {
      console.error("Failed to fetch tags:", error)
    }
  }

  const updateDeckCounts = async () => {
    const counts: { [key: string]: number } = {}

    // Get total count for global filters
    try {
      const params = new URLSearchParams()
      if (bracket) params.append("bracket", bracket.toString())
      if (globalTags.length > 0) params.append("tags", globalTags.join(","))

      const response = await fetch(`/api/decks/count?${params}`)
      const data = await response.json()
      setTotalDeckCount(data.count)
    } catch (error) {
      console.error("Failed to get total deck count:", error)
      setTotalDeckCount(0)
    }

    // Get individual player counts
    for (const player of selectedPlayers) {
      try {
        const prefs = playerPreferences[player]
        const params = new URLSearchParams()

        if (bracket) params.append("bracket", bracket.toString())
        if (globalTags.length > 0) params.append("tags", globalTags.join(","))
        if (prefs.colors.length > 0) params.append("colors", prefs.colors.join(","))
        if (prefs.commander && prefs.commander !== "") params.append("commander", prefs.commander)
        if (prefs.tags.length > 0) params.append("tags", [...globalTags, ...prefs.tags].join(","))

        const response = await fetch(`/api/decks/count?${params}`)
        const data = await response.json()
        counts[player] = data.count
      } catch (error) {
        console.error(`Failed to get deck count for ${player}:`, error)
        counts[player] = 0
      }
    }

    setPlayerDeckCounts(counts)
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
        commander,
      },
    }))
  }

  const handlePlayerTagsChange = (player: string, playerTags: string[]) => {
    setPlayerPreferences((prev) => ({
      ...prev,
      [player]: {
        ...prev[player],
        tags: playerTags,
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
          playerPreferences: Object.fromEntries(selectedPlayers.map((player) => [player, playerPreferences[player]])),
          bracket,
          globalTags,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setAssignment(data.assignment)
        alert(`Assigned decks to ${selectedPlayers.length} players!`)
      } else {
        alert(data.error || "Assignment failed.")
      }
    } catch (error) {
      console.error("Assignment failed:", error)
      alert("Network error.")
    } finally {
      setLoading(false)
    }
  }

  const handleShufflePlayer = async (player: string) => {
    if (!assignment) return

    setShufflingPlayer(player)
    try {
      const response = await fetch("/api/assign/shuffle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player,
          currentDeckId: assignment[player].deck.id,
          playerPreferences: playerPreferences[player],
          currentAssignment: assignment,
          bracket,
          globalTags,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setAssignment((prev) => ({
          ...prev!,
          [player]: {
            deck: data.deck,
          },
        }))
        alert(`${player}: ${data.deck.name}`)
      } else {
        alert(data.error || "No other decks available.")
      }
    } catch (error) {
      console.error("Shuffle failed:", error)
      alert("Network error.")
    } finally {
      setShufflingPlayer(null)
    }
  }

  const copyDeckList = async (deckList: string, deckName: string) => {
    try {
      await navigator.clipboard.writeText(deckList)
      alert(`"${deckName}" copied to clipboard.`)
    } catch (error) {
      alert("Failed to copy deck list.")
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
          })),
        }),
      })

      if (response.ok) {
        alert("Assignment finalized!")
        setAssignment(null)
        updateDeckCounts()
      }
    } catch (error) {
      console.error("Failed to finalize:", error)
      alert("Failed to finalize.")
    }
  }

  const canAssign = selectedPlayers.length > 0 && selectedPlayers.every((player) => (playerDeckCounts[player] || 0) > 0)

  const getColorText = (colors: string[]) => {
    if (colors.length === 0) return "any colors"
    if (colors.length === 1) return `mono-${colors[0].toLowerCase()}`
    return colors.sort().join(" + ")
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
          {/* Global Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Global Filters</CardTitle>
              <p className="text-sm text-muted-foreground">Apply to all players</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bracket Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Bracket</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={bracket === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBracket(null)}
                  >
                    All
                  </Button>
                  {BRACKET_OPTIONS.map((b) => (
                    <Button
                      key={b}
                      type="button"
                      variant={bracket === b ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBracket(b)}
                    >
                      {b}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Global Tags Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <TagCombobox
                  value={globalTags}
                  onValueChange={setGlobalTags}
                  tags={tags}
                  placeholder="Select tags..."
                  allowNewTags={false}
                />
              </div>

              <p className="text-xs text-muted-foreground">{totalDeckCount} decks available with current filters</p>
            </CardContent>
          </Card>

          {/* Player Selection & Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Players & Individual Filters</CardTitle>
              <p className="text-sm text-muted-foreground">Per-player preferences</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {PLAYERS.map((player) => (
                <div key={player} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
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
                      <div className="text-sm font-medium">{playerDeckCounts[player] || 0} available</div>
                    )}
                  </div>

                  {selectedPlayers.includes(player) && (
                    <div className="space-y-3">
                      {/* Colors */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Colors</label>
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
                      </div>

                      {/* Commander */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Commander</label>
                        <CommanderCombobox
                          value={playerPreferences[player].commander}
                          onValueChange={(value) => handlePlayerCommanderChange(player, value)}
                          commanders={commanders}
                          placeholder="Any commander"
                          allowClear={true}
                          allowNewCommander={false}
                        />
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Tags</label>
                        <TagCombobox
                          value={playerPreferences[player].tags}
                          onValueChange={(value) => handlePlayerTagsChange(player, value)}
                          tags={tags}
                          placeholder="Select tags..."
                          allowNewTags={false}
                        />
                      </div>

                      {(playerDeckCounts[player] || 0) === 0 && (
                        <p className="text-xs text-destructive">No decks with these preferences</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Assignment Button - Refactored to be smaller and more user-friendly */}
          <div className="flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-sm text-muted-foreground">
                {selectedPlayers.length} player{selectedPlayers.length !== 1 ? "s" : ""} selected
              </div>

              {!canAssign && selectedPlayers.some((player) => (playerDeckCounts[player] || 0) === 0) && (
                <div className="text-xs text-destructive">Some players have no available decks</div>
              )}

              <Button onClick={handleAssign} disabled={!canAssign || loading} size="lg" className="px-8">
                <Shuffle className="w-4 h-4 mr-2" />
                {loading ? "Assigning..." : "Assign Decks"}
              </Button>
            </div>
          </div>
        </div>

        {/* Assignment Results */}
        <div>
          {assignment && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <p className="text-sm text-muted-foreground">Shuffle individual decks before finalizing</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(assignment).map(([player, data]) => (
                  <div key={player} className="p-4 border rounded-lg space-y-3">
                    <div className="font-semibold text-lg">{player}</div>
                    <div className="font-medium">{data.deck.name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">Commander: {data.deck.commander}</span>
                      <span className="px-2 py-1 bg-secondary rounded text-xs">Bracket {data.deck.bracket}</span>
                      <div className="flex gap-1">
                        {data.deck.colors.map((color) => (
                          <span
                            key={color}
                            className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>

                    {data.deck.tags && data.deck.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {data.deck.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs border">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShufflePlayer(player)}
                        disabled={shufflingPlayer === player}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${shufflingPlayer === player ? "animate-spin" : ""}`} />
                        {shufflingPlayer === player ? "Shuffling..." : "Shuffle"}
                      </Button>

                      {data.deck.deckList && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyDeckList(data.deck.deckList, data.deck.name)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy List
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-4">
                  <Button onClick={finalizeAssignment} className="w-full">
                    Finalize Assignment
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Saves to history and removes decks from pool
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
