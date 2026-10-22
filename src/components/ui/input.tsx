'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Input with a floating label and inline validation.
 *
 * Accessibility contract:
 *  - the label is a real <label for>, not a placeholder, so it is always
 *    announced and never disappears once the field has content;
 *  - the error message is linked via aria-describedby and aria-invalid;
 *  - `peer-placeholder-shown` drives the float, so the label position is CSS
 *    only and stays correct after autofill (which fires no React events).
 */
export type InputProps = Omit<React.ComponentProps<'input'>, 'placeholder'> & {
  label: string
  error?: string
  hint?: string
  /** Leading icon. Padding is adjusted automatically. */
  icon?: React.ReactNode
}

export function Input({
  className,
  label,
  error,
  hint,
  icon,
  id,
  type = 'text',
  required,
  ...props
}: InputProps) {
  const autoId = React.useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {icon ? (
          <span
            aria-hidden="true"
            className="text-foreground-subtle pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 [&_svg]:size-4"
          >
            {icon}
          </span>
        ) : null}

        <input
          id={inputId}
          type={type}
          required={required}
          // A space keeps :placeholder-shown true while empty, which is what
          // the floating label animation hangs off.
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
            undefined
          }
          className={cn(
            'bg-surface peer h-14 w-full rounded-lg border px-3.5 pb-1.5 pt-5',
            'text-foreground font-sans text-[0.9375rem]',
            'transition-[border-color,box-shadow] duration-200',
            'placeholder:text-transparent',
            'hover:border-border-strong',
            'focus:border-primary focus:ring-primary/15 focus:outline-none focus:ring-4',
            'disabled:cursor-not-allowed disabled:opacity-60',
            icon && 'pl-10',
            error
              ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/15'
              : 'border-border',
            className
          )}
          {...props}
        />

        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute left-3.5 top-2 origin-left',
            'font-sans text-[0.6875rem] font-medium uppercase tracking-wide',
            'text-foreground-subtle ease-out-expo transition-all duration-200',
            // Collapsed state while the field is empty and unfocused.
            'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2',
            'peer-placeholder-shown:text-[0.9375rem] peer-placeholder-shown:normal-case',
            'peer-placeholder-shown:tracking-normal',
            'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[0.6875rem]',
            'peer-focus:text-primary peer-focus:uppercase peer-focus:tracking-wide',
            icon && 'left-10 peer-placeholder-shown:left-10 peer-focus:left-10',
            error && 'text-danger-700 peer-focus:text-danger-700'
          )}
        >
          {label}
          {required ? (
            <span aria-hidden="true" className="text-danger-500 ml-0.5">
              *
            </span>
          ) : null}
        </label>
      </div>

      {hint && !error ? (
        <p id={hintId} className="text-meta text-foreground-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-meta text-danger-700 font-medium">
          {error}
        </p>
      ) : null}
    </div>
  )
}
