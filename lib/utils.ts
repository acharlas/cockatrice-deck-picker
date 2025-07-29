import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function colorsMatch(
  deckColors: string[],
  prefColors: string[],
): boolean {
  const sortedDeck = [...deckColors].sort()
  const sortedPref = [...prefColors].sort()
  return (
    sortedDeck.length === sortedPref.length &&
    sortedDeck.every((color, idx) => color === sortedPref[idx])
  )
}

export interface DeckPreferences {
  colors: string[]
  commander?: string
}

export function filterDecks<T extends { colors: string; commander: string }>(
  decks: T[],
  prefs: DeckPreferences,
): T[] {
  let filtered = [...decks]
  if (prefs.colors.length > 0) {
    filtered = filtered.filter((d) =>
      colorsMatch(JSON.parse(d.colors), prefs.colors),
    )
  }
  if (prefs.commander && prefs.commander !== 'Any commander') {
    filtered = filtered.filter((d) =>
      d.commander.toLowerCase().includes(prefs.commander!.toLowerCase()),
    )
  }
  return filtered
}
