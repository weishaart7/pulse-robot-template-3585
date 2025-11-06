"use client"

import { Star, Edit, User } from "lucide-react"
import { cn } from "@/lib/utils"

type ClientCardProps = {
  name: string
  role: string
  status: "online" | "offline" | "away"
  avatar?: string
  tags?: string[]
  isVerified?: boolean
  age?: number
  onClick?: () => void
}

export function ClientInfoCard({ name, role, status, avatar, tags = [], isVerified, age, onClick }: ClientCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl bg-card p-6 w-80 shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.3),-12px_-12px_24px_rgba(255,255,255,0.1)] transition-all duration-500 hover:shadow-[20px_20px_40px_rgba(0,0,0,0.2),-20px_-20px_40px_rgba(255,255,255,1)] dark:hover:shadow-[20px_20px_40px_rgba(0,0,0,0.4),-20px_-20px_40px_rgba(255,255,255,0.15)] hover:scale-105 hover:-translate-y-2 cursor-pointer"
    >
      {/* Status indicator with pulse animation */}
      <div className="absolute right-4 top-4 z-10">
        <div className="relative">
          <div
            className={cn(
              "h-3 w-3 rounded-full border-2 border-background transition-all duration-300 group-hover:scale-125",
              status === "online"
                ? "bg-primary group-hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                : status === "away"
                  ? "bg-amber-500"
                  : "bg-gray-400",
            )}
          ></div>
          {status === "online" && (
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-primary animate-[ping_3s_ease-in-out_infinite] opacity-40"></div>
          )}
        </div>
      </div>

      {/* Edit badge with bounce animation */}
      <div className="absolute right-4 top-10 z-10">
        <div className="rounded-full bg-primary p-1 shadow-[2px_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Edit className="h-3 w-3 text-primary-foreground" />
        </div>
      </div>

      {/* Profile Photo with enhanced hover effects */}
      <div className="mb-4 flex justify-center relative z-10">
        <div className="relative group-hover:animate-pulse">
          <div className="h-28 w-28 overflow-hidden rounded-full bg-muted p-1 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.3),inset_-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.15),inset_-8px_-8px_16px_rgba(255,255,255,1)] dark:group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.4),inset_-8px_-8px_16px_rgba(255,255,255,0.15)] group-hover:scale-110">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-12 w-12 text-primary" />
              </div>
            )}
          </div>
          {/* Glowing ring on hover */}
          <div className="absolute inset-0 rounded-full border-2 border-primary opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
        </div>
      </div>

      {/* Profile Info with slide-up animation */}
      <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
        <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
          {name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          {role}
        </p>

        {age !== undefined && (
          <p className="mt-2 text-xs text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:font-medium">
            {age} ans
          </p>
        )}
      </div>

      {/* Tags with bounce animation */}
      {tags.length > 0 && (
        <div className="mt-4 flex justify-center gap-2 relative z-10">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.1)] transition-all duration-300 text-primary group-hover:bg-primary/10 group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Animated border on hover */}
      <div className="absolute inset-0 rounded-3xl border-2 border-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  )
}
