import React from 'react'

export function Timeline({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5 border-l border-border pl-5">{children}</div>
}

export function TimelineEntry({
  date,
  editor,
  children,
}: {
  date: string
  editor: string
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <span className="absolute -left-[23px] top-1 h-2 w-2 rounded-full bg-border-input" />
      <div className="flex items-baseline gap-2 text-xs text-ink-muted">
        <span>{date}</span>
        <span>·</span>
        <span className="font-medium text-ink-secondary">{editor}</span>
      </div>
      <div className="mt-1 text-sm text-ink-primary">{children}</div>
    </div>
  )
}
