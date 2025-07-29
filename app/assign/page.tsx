"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PLAYERS } from "@/lib/players";
import { COLOR_OPTIONS, BRACKET_OPTIONS } from "@/lib/constants";
import { Shuffle, Home, Copy, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";

interface Deck {
  id: string;
  name: string;
  bracket: number;
  colors: string[];
  commander: string;
  deckList: string;
}

interface Assignment {
  [playerName: string]: {
    deck: Deck;
    pool: Deck[];
  };
}

interface PlayerPreferences {
  [playerName: string]: {
    colors: string[];
    commander: string;
  };
}

export default function AssignPage() {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(PLAYERS);
  const [bracketFilter, setBracketFilter] = useState<number | null>(null);
  const [commanders, setCommanders] = useState<string[]>([]);
  const [commanderSearches, setCommanderSearches] = useState<{
    [key: string]: string;
  }>({});
  const [playerPreferences, setPlayerPreferences] = useState<PlayerPreferences>(
    () => {
      const initial: PlayerPreferences = {};
      PLAYERS.forEach((player) => {
        initial[player] = { colors: [], commander: "Any commander" };
      });
      return initial;
    }
  );
  const [playerCounts, setPlayerCounts] = useState<{ [player: string]: number }>({});
  const [matchingCount, setMatchingCount] = useState(0);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [shufflingPlayer, setShufflingPlayer] = useState<string | null>(null);

  // Fetch commanders on component mount
  useEffect(() => {
    fetchCommanders();
  }, []);

  // Update matching count when filters change
  useEffect(() => {
    updateMatchingCount();
  }, [selectedPlayers, bracketFilter, playerPreferences]);

  const fetchCommanders = async () => {
    try {
      const response = await fetch("/api/commanders");
      const data = await response.json();
      setCommanders(data);
    } catch (error) {
      console.error("Failed to fetch commanders:", error);
    }
  };

  const updateMatchingCount = async () => {
    try {
      const countPromises = selectedPlayers.map(async (player) => {
        const params = new URLSearchParams();
        if (bracketFilter) params.append("bracket", bracketFilter.toString());

        const prefs = playerPreferences[player];
        if (prefs.colors.length > 0) {
          params.append("colors", prefs.colors.join(","));
        }
        if (prefs.commander && prefs.commander !== "Any commander") {
          params.append("commander", prefs.commander);
        }

        const response = await fetch(`/api/decks/count?${params}`);
        const data = await response.json();
        return data.count || 0;
      });

      const counts = await Promise.all(countPromises);
      const countMap: { [player: string]: number } = {};
      selectedPlayers.forEach((player, idx) => {
        countMap[player] = counts[idx];
      });
      setPlayerCounts(countMap);

      const total = counts.reduce((sum, c) => sum + c, 0);
      setMatchingCount(total);
    } catch (error) {
      console.error("Failed to get deck count:", error);
      setMatchingCount(0);
      setPlayerCounts({});
    }
  };

  const handlePlayerToggle = (player: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(player)
        ? prev.filter((p) => p !== player)
        : [...prev, player]
    );
  };

  const handlePlayerColorToggle = (player: string, color: string) => {
    setPlayerPreferences((prev) => ({
      ...prev,
      [player]: {
        ...prev[player],
        colors: prev[player].colors.includes(color)
          ? prev[player].colors.filter((c) => c !== color)
          : [...prev[player].colors, color],
      },
    }));
  };

  const handlePlayerCommanderChange = (player: string, commander: string) => {
    setPlayerPreferences((prev) => ({
      ...prev,
      [player]: {
        ...prev[player],
        commander,
      },
    }));
    // Clear search when selection is made
    setCommanderSearches((prev) => ({ ...prev, [player]: "" }));
  };

  const handleCommanderSearchChange = (player: string, search: string) => {
    setCommanderSearches((prev) => ({ ...prev, [player]: search }));
  };

  const getFilteredCommanders = (player: string) => {
    const search = commanderSearches[player] || "";
    if (!search) return commanders;
    return commanders.filter((commander) =>
      commander.toLowerCase().includes(search.toLowerCase())
    );
  };

  const clearCommanderSelection = (player: string) => {
    setPlayerPreferences((prev) => ({
      ...prev,
      [player]: {
        ...prev[player],
        commander: "Any commander",
      },
    }));
    setCommanderSearches((prev) => ({ ...prev, [player]: "" }));
  };

  const handleAssign = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: selectedPlayers,
          bracket: bracketFilter,
          playerPreferences: Object.fromEntries(
            selectedPlayers.map((player) => [player, playerPreferences[player]])
          ),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const combined: Assignment = {} as Assignment;
        Object.keys(data.assignment).forEach((player) => {
          combined[player] = {
            deck: data.assignment[player].deck,
            pool: data.pools[player] || [],
          };
        });
        setAssignment(combined);
        alert(
          `Successfully assigned decks to ${selectedPlayers.length} players! You can shuffle individual decks before finalizing.`
        );
      } else {
        alert(data.error || "Assignment failed. Please try again.");
      }
    } catch (error) {
      console.error("Assignment failed:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShufflePlayer = async (player: string) => {
    if (!assignment) return;

    setShufflingPlayer(player);
    try {
      const response = await fetch("/api/assign/shuffle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player,
          currentDeckId: assignment[player].deck.id,
          bracket: bracketFilter,
          playerPreferences: playerPreferences[player],
          currentAssignment: assignment, // Pass current assignment to avoid conflicts
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAssignment((prev) => {
          const updated = { ...prev! };
          updated[player] = {
            deck: data.deck,
            pool: data.pool,
          };
          return updated;
        });
        alert(`${player} got a new deck: ${data.deck.name}`);
      } else {
        alert(data.error || "No other decks available for this player.");
      }
    } catch (error) {
      console.error("Shuffle failed:", error);
      alert("Network error. Please try again.");
    } finally {
      setShufflingPlayer(null);
    }
  };

  const copyDeckList = async (deckList: string, deckName: string) => {
    try {
      await navigator.clipboard.writeText(deckList);
      alert(`Deck list for "${deckName}" copied to clipboard.`);
    } catch (error) {
      alert("Failed to copy deck list to clipboard.");
    }
  };

  const finalizeAssignment = async () => {
    if (!assignment) return;

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
      });

      if (response.ok) {
        alert(
          "Assignment has been finalized and saved to history! These decks are now removed from the available pool."
        );
        // Clear assignment after finalization
        setAssignment(null);
        // Refresh the deck count
        updateMatchingCount();
      }
    } catch (error) {
      console.error("Failed to finalize assignment:", error);
      alert("Failed to finalize assignment. Please try again.");
    }
  };

  const canAssign =
    selectedPlayers.length > 0 &&
    Object.values(playerCounts).every((c) => c > 0);

  // Helper function to get color combination display
  const getColorCombinationText = (colors: string[]) => {
    if (colors.length === 0) return "any color combination";
    if (colors.length === 1) return `mono-${colors[0].toLowerCase()}`;
    return `exactly ${[...colors].sort().join(" + ")}`;
  };

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
                <label className="block text-sm font-medium mb-2">
                  Bracket Level
                </label>
                <Select
                  value={bracketFilter?.toString() || "0"}
                  onValueChange={(value) =>
                    setBracketFilter(value ? Number.parseInt(value) : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any bracket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any bracket</SelectItem>
                    {BRACKET_OPTIONS.map((bracket) => (
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
              <CardTitle>Players & Preferences</CardTitle>
              <p className="text-sm text-gray-600">
                Color preferences are exclusive - selecting "Blue" will only
                match mono-blue decks, not blue-white or blue-red combinations.
              </p>
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
                    <div className="space-y-3">
                      {/* Color Preferences */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Preferred Colors (Exclusive Match)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_OPTIONS.map((color) => (
                            <Button
                              key={color}
                              type="button"
                              variant={
                                playerPreferences[player].colors.includes(color)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handlePlayerColorToggle(player, color)
                              }
                            >
                              {color}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Will match decks with{" "}
                          {getColorCombinationText(
                            playerPreferences[player].colors
                          )}
                        </p>
                      </div>

                      {/* Commander Preference with Search */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Preferred Commander
                        </label>
                        <div className="space-y-2">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                              placeholder="Type to search commanders..."
                              value={commanderSearches[player] || ""}
                              onChange={(e) =>
                                handleCommanderSearchChange(
                                  player,
                                  e.target.value
                                )
                              }
                              className="pl-10"
                            />
                          </div>

                          {/* Current Selection Display */}
                          {playerPreferences[player].commander !==
                            "Any commander" && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                              <span className="text-sm font-medium">
                                Selected: {playerPreferences[player].commander}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => clearCommanderSelection(player)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}

                          {/* Filtered Commander List */}
                          {(commanderSearches[player] || "") && (
                            <div className="max-h-40 overflow-y-auto border rounded-md bg-white">
                              {getFilteredCommanders(player).length > 0 ? (
                                getFilteredCommanders(player)
                                  .slice(0, 10)
                                  .map((commander) => (
                                    <button
                                      key={commander}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0"
                                      onClick={() =>
                                        handlePlayerCommanderChange(
                                          player,
                                          commander
                                        )
                                      }
                                    >
                                      {commander}
                                    </button>
                                  ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  No commanders found
                                </div>
                              )}
                              {getFilteredCommanders(player).length > 10 && (
                                <div className="px-3 py-2 text-xs text-gray-400 border-t">
                                  Showing first 10 results. Keep typing to
                                  narrow down...
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick Access Buttons for Any Commander */}
                          {!commanderSearches[player] &&
                            playerPreferences[player].commander ===
                              "Any commander" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handlePlayerCommanderChange(
                                    player,
                                    "Any commander"
                                  )
                                }
                                className="w-full"
                              >
                                Any commander
                              </Button>
                            )}
                        </div>
                      <p className="text-xs text-gray-600">
                        {(playerCounts[player] ?? 0)} decks available
                      </p>
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Assignment Button */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">
                  {matchingCount} decks available
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {selectedPlayers.length} players selected
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  Available count excludes finalized assignments only
                </div>

                {!canAssign && matchingCount === 0 && (
                  <div className="text-red-600 mb-4">
                    No decks match the current preferences
                  </div>
                )}

                {!canAssign &&
                  matchingCount > 0 &&
                  matchingCount < selectedPlayers.length && (
                    <div className="text-red-600 mb-4">
                      Not enough decks for selected players
                    </div>
                  )}

                <Button
                  onClick={handleAssign}
                  disabled={!canAssign || loading}
                  size="lg"
                  className="w-full"
                >
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
                <p className="text-sm text-gray-600">
                  You can shuffle individual decks before finalizing. Decks are
                  only removed from the pool when finalized.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(assignment).map(([player, data]) => (
                  <div key={player} className="p-4 border rounded-lg space-y-3">
                    <div className="font-semibold text-lg">{player}</div>
                    <div className="font-medium">{data.deck.name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">
                        Bracket {data.deck.bracket}
                      </span>
                      <span className="text-sm font-medium">
                        Commander: {data.deck.commander}
                      </span>
                      <div className="flex gap-1">
                        {data.deck.colors.map((color) => (
                          <Badge
                            key={color}
                            variant="secondary"
                            className="text-xs"
                          >
                            {color}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Show if preferences were matched */}
                    <div className="text-xs space-y-1">
                      {playerPreferences[player].colors.length > 0 && (
                        <div>
                          {/* Check for exact color match */}
                          {(() => {
                            const sortedDeckColors = [
                              ...data.deck.colors,
                            ].sort();
                            const sortedPrefColors = [
                              ...playerPreferences[player].colors,
                            ].sort();
                            const exactMatch =
                              sortedDeckColors.length ===
                                sortedPrefColors.length &&
                              sortedDeckColors.every(
                                (color, index) =>
                                  color === sortedPrefColors[index]
                              );
                            return exactMatch ? (
                              <div className="text-green-600">
                                ✓ Matched exact color combination
                              </div>
                            ) : (
                              <div className="text-orange-600">
                                ⚠ Color preference not matched exactly
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      {playerPreferences[player].commander !==
                        "Any commander" &&
                        data.deck.commander
                          .toLowerCase()
                          .includes(
                            playerPreferences[player].commander.toLowerCase()
                          ) && (
                          <div className="text-green-600">
                            ✓ Matched commander preference
                          </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                      {/* Shuffle Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShufflePlayer(player)}
                        disabled={
                          shufflingPlayer === player ||
                          (assignment && assignment[player].pool.length === 0)
                        }
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${
                            shufflingPlayer === player ? "animate-spin" : ""
                          }`}
                        />
                        {shufflingPlayer === player
                          ? "Shuffling..."
                          : "Shuffle Deck"}
                      </Button>

                      {/* Copy Deck List Button */}
                      {data.deck.deckList && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyDeckList(data.deck.deckList, data.deck.name)
                          }
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Deck List
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-4">
                  <Button
                    onClick={finalizeAssignment}
                    className="w-full"
                    variant="default"
                  >
                    Finalize Assignment
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    This will save to history and remove these decks from the
                    available pool
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
