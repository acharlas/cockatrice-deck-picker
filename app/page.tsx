"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shuffle, History, Settings, Lock } from "lucide-react"

const ADMIN_PASSWORD = "deck-master-2024"

export default function HomePage() {
  const [password, setPassword] = useState("")
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const router = useRouter()

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (password === ADMIN_PASSWORD) {
      alert("Access granted! Redirecting to admin panel...")
      router.push(`/admin/decks?admin=${ADMIN_PASSWORD}`)
    } else {
      alert("Incorrect password. Please try again.")
      setPassword("")
    }
  }

  return (
    <div className="container mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Deck Assignment System</h1>
        <p className="text-gray-600 text-lg">
          Assign random decks to players with smart filtering and uniqueness tracking
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="w-5 h-5" />
              Assign Decks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Select players and filters, then randomly assign decks with uniqueness tracking.
            </p>
            <Button asChild className="w-full">
              <Link href="/assign">Start Assignment</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              View History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">See past assignments and reset the uniqueness tracking when needed.</p>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/history">View History</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manage Decks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Admin interface to create, edit, and manage the deck library.</p>

            {!showPasswordForm ? (
              <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowPasswordForm(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Access Admin Panel
              </Button>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="password" className="text-sm">
                    Admin Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1">
                    Access
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPassword("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <div className="text-sm text-gray-500">
          <p>Players: tacos4k, Cali, Stipowl, Toth</p>
          <p>Built with Next.js, TypeScript, Prisma & SQLite</p>
        </div>
      </div>
    </div>
  )
}
