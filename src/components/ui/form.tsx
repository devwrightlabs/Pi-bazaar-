'use client'

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type LabelHTMLAttributes } from 'react'

/* ─── Label ───────────────────────────────────────────────────────────── */

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className = '', required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={`block text-sm font-medium mb-1.5 ${className}`}
      style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}
      {...props}
    >
      {children}
      {required && <span style={{ color: 'var(--color-error)' }}> *</span>}
    </label>
  ),
)
FormLabel.displayName = 'FormLabel'

/* ─── Input ───────────────────────────────────────────────────────────── */

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className = '', error, ...props }, ref) => (
    <div>
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${className}`}
        style={{
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text)',
          border: error
            ? '1px solid var(--color-error)'
            : '1px solid rgba(136,136,136,0.3)',
          caretColor: 'var(--color-gold)',
        }}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}
    </div>
  ),
)
FormInput.displayName = 'FormInput'

/* ─── Textarea ────────────────────────────────────────────────────────── */

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className = '', error, ...props }, ref) => (
    <div>
      <textarea
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-colors ${className}`}
        style={{
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text)',
          border: error
            ? '1px solid var(--color-error)'
            : '1px solid rgba(136,136,136,0.3)',
          caretColor: 'var(--color-gold)',
        }}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}
    </div>
  ),
)
FormTextarea.displayName = 'FormTextarea'

/* ─── Select ──────────────────────────────────────────────────────────── */

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className = '', error, children, ...props }, ref) => (
    <div>
      <select
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none ${className}`}
        style={{
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text)',
          border: error
            ? '1px solid var(--color-error)'
            : '1px solid rgba(136,136,136,0.3)',
        }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}
    </div>
  ),
)
FormSelect.displayName = 'FormSelect'

/* ─── Toggle Switch ───────────────────────────────────────────────────── */

export interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  leftLabel?: string
  rightLabel?: string
  disabled?: boolean
  className?: string
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  leftLabel,
  rightLabel,
  disabled = false,
  className = '',
}: ToggleSwitchProps) {
  return (
    <div
      className={`flex items-center justify-between py-3 px-4 rounded-xl ${className}`}
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      <div className="flex-1 min-w-0 mr-3">
        {label && (
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {label}
          </p>
        )}
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtext)' }}>
            {description}
          </p>
        )}
        {(leftLabel || rightLabel) && (
          <div className="flex items-center gap-2 mt-1">
            {leftLabel && (
              <span
                className="text-xs font-semibold"
                style={{ color: !checked ? 'var(--color-gold)' : 'var(--color-subtext)' }}
              >
                {leftLabel}
              </span>
            )}
            {leftLabel && rightLabel && (
              <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>/</span>
            )}
            {rightLabel && (
              <span
                className="text-xs font-semibold"
                style={{ color: checked ? 'var(--color-gold)' : 'var(--color-subtext)' }}
              >
                {rightLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
        style={{
          backgroundColor: checked ? 'var(--color-gold)' : 'rgba(136,136,136,0.3)',
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full transition-transform bg-white"
          style={{
            transform: checked ? 'translateX(26px)' : 'translateX(2px)',
          }}
        />
      </button>
    </div>
  )
}
