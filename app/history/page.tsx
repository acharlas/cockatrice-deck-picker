"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RotateCcw, Home } from "lucide-react"
import Link from "next/link"

interface HistoryEntry {
  id: string
  gameId: string
  playerName: string
  deckName: string
  assignedAt: string
}

interface GameGroup {
  gameId: string
  assignments: HistoryEntry[]
  assignedAt: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [groupedHistory, setGroupedHistory] = useState<{ [key: string]: GameGroup }>({})

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/history")
      const data = await response.json()
      setHistory(data)
    } catch (error) {
      console.error("Failed to fetch history:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!confirm("Reset assignment history? This will allow previously assigned decks to be assigned again.")) {
      return
    }

    try {
      const response = await fetch("/api/history/reset", {
        method: "POST",
      })

      if (response.ok) {
        fetchHistory()
        alert("History reset successfully!")
      }
    } catch (error) {
      console.error("Failed to reset history:", error)
      alert("Failed to reset history")
    }
  }

  useEffect(() => {
    // Group history by gameId
    const grouped = history.reduce(
      (acc, entry) => {
        if (!acc[entry.gameId]) {
          acc[entry.gameId] = {
            gameId: entry.gameId,
            assignments: [],
            assignedAt: entry.assignedAt,
          }
        }
        acc[entry.gameId].assignments.push(entry)
        return acc
      },
      {} as { [key: string]: GameGroup },
    )

    setGroupedHistory(grouped)
  }, [history])

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Loading history...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Assignment History</h1>
        </div>
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset History
        </Button>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No assignments yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Go to the{" "}
              <a href="/assign" className="text-blue-600 hover:underline">
                assignment page
              </a>{" "}
              to start assigning decks.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="text-sm text-gray-600 mb-4">
            Total games: {Object.keys(groupedHistory).length} | Total assignments: {history.length}
          </div>

          {Object.entries(groupedHistory).map(([gameId, gameData]) => (
            <Card key={gameId}>
              <CardContent className="p-4">
                <div className="font-semibold text-lg mb-3">
                  Game {gameId} - {new Date(gameData.assignedAt).toLocaleString()}
                </div>
                <div className="grid gap-2">
                  {gameData.assignments.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{entry.playerName}</span>
                        <span className="text-gray-600 ml-2">{entry.deckName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
