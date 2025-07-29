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
import { CommanderCombobox } from "@/app/ownCompo/commander-combobox"
import { TagCombobox } from "@/app/ownCompo/tag-combobox"
import { ADMIN_PASSWORD, COLOR_OPTIONS, BRACKET_OPTIONS } from "@/lib/constants"
import Link from "next/link"

interface Deck {
  id: string
  name: string
  colors: string[]
  commander: string
  bracket: number
  tags: string[]
  deckList?: string
  createdAt: string
}

export default function AdminDecks() {
  const searchParams = useSearchParams()
  const [decks, setDecks] = useState<Deck[]>([])
  const [commanders, setCommanders] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    colors: [] as string[],
    commander: "",
    bracket: 1,
    tags: [] as string[],
    deckList: "",
  })

  const isAuthorized = searchParams.get("admin") === ADMIN_PASSWORD

  useEffect(() => {
    if (isAuthorized) {
      fetchDecks()
      fetchCommanders()
      fetchTags()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert("Deck name required!")
      return
    }

    if (!formData.commander.trim()) {
      alert("Commander required!")
      return
    }

    if (formData.colors.length === 0) {
      alert("Select at least one color!")
      return
    }

    const method = editingDeck ? "PUT" : "POST"
    const url = editingDeck ? `/api/decks/${editingDeck.id}` : "/api/decks"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(`Deck "${formData.name}" ${editingDeck ? "updated" : "created"}!`)
        fetchDecks()
        fetchCommanders()
        fetchTags()
        resetForm()
      }
    } catch (error) {
      alert("Failed to save deck.")
    }
  }

  const handleDelete = async (deck: Deck) => {
    if (!confirm(`Delete "${deck.name}"?`)) return

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert(`Deck "${deck.name}" deleted!`)
        fetchDecks()
        fetchCommanders()
        fetchTags()
      }
    } catch (error) {
      alert("Failed to delete deck.")
    }
  }

  const handleEdit = (deck: Deck) => {
    setEditingDeck(deck)
    setFormData({
      name: deck.name,
      colors: deck.colors,
      commander: deck.commander,
      bracket: deck.bracket,
      tags: deck.tags || [],
      deckList: deck.deckList || "",
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingDeck(null)
    setShowForm(false)
    setFormData({ name: "", colors: [], commander: "", bracket: 1, tags: [], deckList: "" })
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
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">Admin access required.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center text-muted-foreground">Loading...</div>
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
          <h1 className="text-3xl font-bold">Deck Library</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportDecks} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
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
            <CardTitle>{editingDeck ? "Edit Deck" : "Add Deck"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Commander</Label>
                <CommanderCombobox
                  value={formData.commander}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, commander: value }))}
                  commanders={commanders}
                  placeholder="Select or type commander..."
                  allowNewCommander={true}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Bracket</Label>
                <div className="flex gap-2 mt-2">
                  {BRACKET_OPTIONS.map((bracket) => (
                    <Button
                      key={bracket}
                      type="button"
                      variant={formData.bracket === bracket ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, bracket }))}
                    >
                      {bracket}
                    </Button>
                  ))}
                </div>
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
                <Label>Tags (Optional)</Label>
                <TagCombobox
                  value={formData.tags}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, tags: value }))}
                  tags={tags}
                  placeholder="Select or add tags..."
                  allowNewTags={true}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="deckList">Deck List</Label>
                <textarea
                  id="deckList"
                  className="w-full min-h-[200px] p-3 border border-input rounded-md resize-vertical font-mono text-sm bg-background"
                  placeholder="One card per line..."
                  value={formData.deckList}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deckList: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingDeck ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <div className="text-sm text-muted-foreground mb-4">Total: {decks.length} decks</div>

        {decks.map((deck) => (
          <Card key={deck.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{deck.name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm font-medium">Commander: {deck.commander}</span>
                    <Badge variant="outline">Bracket {deck.bracket}</Badge>
                    <div className="flex gap-1">
                      {deck.colors.map((color) => (
                        <Badge key={color} variant="secondary" className="text-xs">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {deck.tags && deck.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {deck.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(deck.createdAt).toLocaleDateString()}
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
