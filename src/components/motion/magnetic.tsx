'use client'

import { motion, useReducedMotion, useSpring } from 'framer-motion'
import * as React from 'react'

/**
 * Magnetic hover: the child drifts a few pixels toward the cursor.
 *
 * INP safety: pointer handling writes to a spring (which drives a transform on
 * the compositor) instead of setting React state, so moving the mouse does not
 * trigger a re-render on every pointermove event.
 */
export function Magnetic({
  children,
  strength = 0.25,
  className,
}: {
  children: React.ReactNode
  /** 0 = inert, 1 = follows the cursor exactly. */
  strength?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const ref = React.useRef<HTMLDivElement>(null)
  const x = useSpring(0, { stiffness: 260, damping: 22, mass: 0.4 })
  const y = useSpring(0, { stiffness: 260, damping: 22, mass: 0.4 })

  if (reduce) return <div className={className}>{children}</div>

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }

  function reset() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      // Touch devices have no hover; a tap should not leave the element offset.
      onPointerCancel={reset}
    >
      {children}
    </motion.div>
  )
}
