"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Edit, Plus, Download, Home } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ADMIN_SECRET, COLOR_OPTIONS } from "@/lib/constants"

interface Deck {
  id: string
  name: string
  bracket: number
  colors: string[]
  commander?: string
  deckList?: string
  createdAt: string
}


export default function AdminDecks() {
  const searchParams = useSearchParams()
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    bracket: 1,
    colors: [] as string[],
    commander: "",
    deckList: "",
  })
  const { toast } = useToast()

  const isAuthorized = searchParams.get("admin") === ADMIN_SECRET

  useEffect(() => {
    if (isAuthorized) {
      fetchDecks()
    }
  }, [isAuthorized])

  const fetchDecks = async () => {
    try {
      const response = await fetch("/api/decks")
      const data = await response.json()
      setDecks(data)
    } catch (error) {
      console.error("Failed to fetch decks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const method = editingDeck ? "PUT" : "POST"
    const url = editingDeck ? `/api/decks/${editingDeck.id}` : "/api/decks"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Deck "${formData.name}" ${editingDeck ? "updated" : "created"} successfully!`,
          variant: "success",
        })
        fetchDecks()
        resetForm()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save deck. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (deck: Deck) => {
    if (!confirm(`Delete "${deck.name}"?`)) return

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Deck "${deck.name}" deleted successfully!`,
          variant: "success",
        })
        fetchDecks()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete deck. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (deck: Deck) => {
    setEditingDeck(deck)
    setFormData({
      name: deck.name,
      bracket: deck.bracket,
      colors: deck.colors,
      commander: deck.commander || "",
      deckList: deck.deckList || "",
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingDeck(null)
    setShowForm(false)
    setFormData({ name: "", bracket: 1, colors: [], commander: "", deckList: "" })
  }

  const handleColorToggle = (color: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter((c) => c !== color) : [...prev.colors, color],
    }))
  }

  const exportDecks = () => {
    const dataStr = JSON.stringify(decks, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `deck-library-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p>You need the admin secret to access this page.</p>
            <p className="text-sm text-gray-600 mt-2">Add ?admin=SECRET to the URL</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Loading decks...</div>
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
          <h1 className="text-3xl font-bold">Deck Library Admin</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportDecks} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Library
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Deck
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingDeck ? "Edit Deck" : "Add New Deck"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Deck Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="bracket">Bracket Level</Label>
                <Input
                  id="bracket"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.bracket}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bracket: Number.parseInt(e.target.value) }))}
                  required
                />
              </div>

              <div>
                <Label>Colors</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLOR_OPTIONS.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant={formData.colors.includes(color) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleColorToggle(color)}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="commander">Commander</Label>
                <Input
                  id="commander"
                  value={formData.commander}
                  onChange={(e) => setFormData((prev) => ({ ...prev, commander: e.target.value }))}
                  placeholder="Enter commander name..."
                />
              </div>

              <div>
                <Label htmlFor="deckList">Deck List</Label>
                <textarea
                  id="deckList"
                  className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md resize-vertical font-mono text-sm"
                  placeholder="Enter deck list (one card per line)..."
                  value={formData.deckList}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deckList: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingDeck ? "Update" : "Create"} Deck</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <div className="text-sm text-gray-600 mb-4">Total decks: {decks.length}</div>

        {decks.map((deck) => (
          <Card key={deck.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{deck.name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm">Bracket: {deck.bracket}</span>
                    {deck.commander && <span className="text-sm">Commander: {deck.commander}</span>}
                    <div className="flex gap-1">
                      {deck.colors.map((color) => (
                        <Badge key={color} variant="secondary" className="text-xs">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created: {new Date(deck.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(deck)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(deck)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
