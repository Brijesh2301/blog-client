'use client'

import { motion, useScroll, useSpring } from 'framer-motion'

/**
 * Reading-progress bar for article pages.
 *
 * Fixed-position and 2px tall, so it is outside the document flow and adds
 * zero CLS. Driven by useScroll -> useSpring, which animates scaleX on the
 * compositor rather than re-rendering on scroll.
 */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 28,
    restDelta: 0.001,
  })

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="from-brand-500 via-brand-400 to-accent-400 fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r"
    />
  )
}
