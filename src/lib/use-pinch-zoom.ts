import { useEffect, useRef } from 'react'

const MIN_FONT = 14
const MAX_FONT = 32

export function usePinchZoom(
  containerRef: React.RefObject<HTMLElement | null>,
  fontSize: number,
  onFontChange: (n: number) => void
): React.RefObject<boolean> {
  const fontRef = useRef(fontSize)
  const onChangeRef = useRef(onFontChange)
  const isPinchingRef = useRef(false)

  useEffect(() => { fontRef.current = fontSize }, [fontSize])
  useEffect(() => { onChangeRef.current = onFontChange }, [onFontChange])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let pinch: { dist: number; font: number } | null = null

    function getDist(touches: TouchList) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function onStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        isPinchingRef.current = true
        pinch = { dist: getDist(e.touches), font: fontRef.current }
      }
    }

    function onMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault()
        const scale = getDist(e.touches) / pinch.dist
        const next = Math.round(
          Math.min(MAX_FONT, Math.max(MIN_FONT, pinch.font * scale))
        )
        onChangeRef.current(next)
      }
    }

    function onEnd() {
      pinch = null
      setTimeout(() => { isPinchingRef.current = false }, 300)
    }

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -1 : 1
      // Update fontRef immediately so rapid scrolling accumulates correctly
      fontRef.current = Math.round(
        Math.min(MAX_FONT, Math.max(MIN_FONT, fontRef.current + delta))
      )
      onChangeRef.current(fontRef.current)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [containerRef])

  return isPinchingRef
}
