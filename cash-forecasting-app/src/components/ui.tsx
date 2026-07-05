import React from 'react'

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg bg-btn-primary-bg px-4 py-2 text-sm font-medium text-white transition hover:bg-btn-primary-active disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-btn-secondary-border bg-btn-secondary-bg px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-page ${className}`}
    >
      {children}
    </button>
  )
}

export function Pill({
  children,
  bg,
  text,
  className = '',
}: {
  children: React.ReactNode
  bg: string
  text: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {children}
    </span>
  )
}

export function NeutralPill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-chip-neutral-bg px-2.5 py-1 text-xs font-medium text-chip-neutral ${className}`}>
      {children}
    </span>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={`inline-flex items-center rounded-full border border-border-subtle bg-border-subtle/60 p-0.5 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active ? 'bg-btn-primary-bg text-white' : 'text-ink-primary hover:bg-white/60'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-card border border-border bg-card ${className}`}>{children}</div>
}

export function EmDash() {
  return <span className="text-ink-muted">—</span>
}

export function LabelCaps({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`label-caps ${className}`}>{children}</div>
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full rounded-input border border-border-input bg-white px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-ink-primary focus:outline-none ${className}`}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return (
    <textarea
      {...rest}
      className={`w-full rounded-input border border-border-input bg-white px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-ink-primary focus:outline-none ${className}`}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-input border border-border-input bg-white px-3 py-2 pr-8 text-sm text-ink-primary focus:border-ink-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="label-caps mb-1.5 block">{children}</label>
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-secondary">{hint}</p>}
    </div>
  )
}

export function Drawer({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  widthClassName = 'w-[520px]',
}: {
  open: boolean
  onClose: () => void
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  widthClassName?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative flex ${widthClassName} max-w-full flex-col border-l border-border bg-card shadow-none`}>
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-page text-ink-primary">{icon}</div>
            )}
            <h2 className="font-serif text-lg text-ink-primary">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary transition hover:bg-page"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  widthClassName = 'w-[440px]',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  widthClassName?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative ${widthClassName} max-w-full rounded-card border border-border bg-card p-7`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink-primary">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-secondary transition hover:bg-page"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PencilIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path
        d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path
        d="M4 6h12M8 6V4.5a1 1 0 011-1h2a1 1 0 011 1V6M6 6l.6 10a1 1 0 001 .9h4.8a1 1 0 001-.9L14 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PlusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronRight({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M7.5 4.5l5 5.5-5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
