"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/ownCompo/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TagComboboxProps {
  value: string[]
  onValueChange: (value: string[]) => void
  tags: string[]
  placeholder?: string
  allowNewTags?: boolean
  className?: string
}

export function TagCombobox({
  value,
  onValueChange,
  tags,
  placeholder = "Select tags...",
  allowNewTags = false,
  className,
}: TagComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange([])
    setInputValue("")
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
  }

  const handleSelect = (selectedValue: string) => {
    const newValue = value.includes(selectedValue)
      ? value.filter((v) => v !== selectedValue)
      : [...value, selectedValue]
    onValueChange(newValue)
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && allowNewTags && inputValue.trim() && !value.includes(inputValue.trim())) {
      e.preventDefault()
      onValueChange([...value, inputValue.trim()])
      setInputValue("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    onValueChange(value.filter((tag) => tag !== tagToRemove))
  }

  // Filter tags based on input
  const filteredTags = tags.filter((tag) => tag.toLowerCase().includes(inputValue.toLowerCase()))

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Tags Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
            >
              {tag}
              <X className="h-3 w-3 cursor-pointer hover:opacity-70" onClick={() => removeTag(tag)} />
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent"
          >
            {value.length > 0 ? `${value.length} tag${value.length > 1 ? "s" : ""} selected` : placeholder}
            <div className="flex items-center gap-1">
              {value.length > 0 && (
                <X className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100" onClick={handleClear} />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={inputValue}
              onValueChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              {filteredTags.length === 0 && !allowNewTags && <CommandEmpty>No tags found.</CommandEmpty>}
              {filteredTags.length === 0 && allowNewTags && inputValue.trim() && (
                <CommandEmpty>Press Enter to add "{inputValue.trim()}" as new tag</CommandEmpty>
              )}
              {filteredTags.length === 0 && allowNewTags && !inputValue.trim() && (
                <CommandEmpty>Type to search or add new tags</CommandEmpty>
              )}
              <CommandGroup>
                {filteredTags.map((tag) => (
                  <CommandItem key={tag} value={tag} onSelect={handleSelect}>
                    <Check className={cn("mr-2 h-4 w-4", value.includes(tag) ? "opacity-100" : "opacity-0")} />
                    {tag}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
