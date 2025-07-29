"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/ownCompo/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CommanderComboboxProps {
  value: string
  onValueChange: (value: string) => void
  commanders: string[]
  placeholder?: string
  allowClear?: boolean
  allowNewCommander?: boolean // New prop to control if new commanders can be added
  className?: string
}

export function CommanderCombobox({
  value,
  onValueChange,
  commanders,
  placeholder = "Select commander...",
  allowClear = false,
  allowNewCommander = false, // Default to false for assignment page
  className,
}: CommanderComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange("")
    setInputValue("")
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
  }

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue === value ? "" : selectedValue)
    setInputValue("")
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && allowNewCommander && inputValue.trim()) {
      // Allow creating new commander names when allowNewCommander is true
      e.preventDefault()
      onValueChange(inputValue.trim())
      setInputValue("")
      setOpen(false)
    }
  }

  // Filter commanders based on input
  const filteredCommanders = commanders.filter((commander) =>
    commander.toLowerCase().includes(inputValue.toLowerCase()),
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value || placeholder}
          <div className="flex items-center gap-1">
            {allowClear && value && (
              <X className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100" onClick={handleClear} />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search commanders..."
            value={inputValue}
            onValueChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {filteredCommanders.length === 0 && !allowNewCommander && <CommandEmpty>No commander found.</CommandEmpty>}
            {filteredCommanders.length === 0 && allowNewCommander && inputValue.trim() && (
              <CommandEmpty>Press Enter to add "{inputValue.trim()}" as new commander</CommandEmpty>
            )}
            {filteredCommanders.length === 0 && allowNewCommander && !inputValue.trim() && (
              <CommandEmpty>Type to search or add new commander</CommandEmpty>
            )}
            <CommandGroup>
              {filteredCommanders.map((commander) => (
                <CommandItem key={commander} value={commander} onSelect={handleSelect}>
                  <Check className={cn("mr-2 h-4 w-4", value === commander ? "opacity-100" : "opacity-0")} />
                  {commander}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
