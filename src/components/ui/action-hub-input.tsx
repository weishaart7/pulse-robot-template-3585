"use client"

import { useId, useState, useRef, useEffect } from "react"
import { Loader2Icon, CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface ActionHubInputAction {
  icon: JSX.Element
  onClick: (value: string) => Promise<void> | void
  tooltip?: string
  showOnEmpty?: boolean
}

interface ActionHubInputProps {
  label?: string
  placeholder?: string
  type?: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  validate?: (value: string) => string | null
  actions?: ActionHubInputAction[]
  historyEnabled?: boolean
  required?: boolean
  className?: string
}

export default function ActionHubInput({
  label = "Action Input",
  placeholder = "Type command, email, or snippet...",
  type = "text",
  defaultValue = "",
  value,
  onChange,
  validate,
  actions = [],
  historyEnabled = true,
  required = false,
  className = "",
}: ActionHubInputProps) {
  const id = useId()
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentValue = value !== undefined ? value : internalValue

  // Load history
  useEffect(() => {
    if (historyEnabled) {
      const saved = localStorage.getItem(`actionhub-${id}`)
      if (saved) setHistory(JSON.parse(saved))
    }
  }, [id, historyEnabled])

  // Save history on submit
  const saveToHistory = (val: string) => {
    if (!historyEnabled || !val) return
    const newHistory = [val, ...history.filter((h) => h !== val)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem(`actionhub-${id}`, JSON.stringify(newHistory))
  }

  const handleActionClick = async (action: ActionHubInputAction) => {
    try {
      setStatus("loading")
      await action.onClick(currentValue)
      setStatus("success")
      saveToHistory(currentValue)
      setTimeout(() => setStatus("idle"), 1500)
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 1500)
    }
  }

  const handleValueChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue)
    } else {
      setInternalValue(newValue)
    }
  }

  // Validation
  useEffect(() => {
    if (validate) setError(validate(currentValue))
    else setError(null)
  }, [currentValue, validate])

  const renderStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2Icon className="animate-spin text-blue-500" size={16} />
      case "success":
        return <CheckCircle2Icon className="text-green-500" size={16} />
      case "error":
        return <XCircleIcon className="text-red-500" size={16} />
      default:
        return null
    }
  }

  return (
    <div className={`relative w-full flex flex-col gap-1 ${className}`}>
      {label && (
        <Label htmlFor={id} className="text-xs">
          {label} {required && <span className="text-red-800">*</span>}
        </Label>
      )}
      <div className="relative flex items-center">
        <Input
          id={id}
          ref={inputRef}
          type={type}
          placeholder={placeholder}
          value={currentValue}
          onChange={(e) => handleValueChange(e.target.value)}
          className={`bg-muted border-transparent shadow-none focus-visible:bg-background focus-visible:border-ring ${actions.length > 0 ? 'pr-24' : 'pr-8'}`}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
        />

        {/* Status icon */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2">{renderStatusIcon()}</div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            {actions.map(
              (action, idx) =>
                (currentValue || action.showOnEmpty) && (
                  <Button
                    key={idx}
                    size="icon"
                    variant="ghost"
                    onClick={() => handleActionClick(action)}
                    title={action.tooltip}
                    className="h-8 w-8 rounded-md p-1"
                  >
                    {action.icon}
                  </Button>
                )
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* History dropdown */}
      {showHistory && history.length > 0 && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-background shadow-lg z-10 max-h-36 overflow-auto">
          {history.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left px-2 py-1 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-sm"
              onClick={() => handleValueChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}