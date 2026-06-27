'use client'

interface Props {
  lines: string[]
  fontSize: number
}

export default function NormalView({ lines, fontSize }: Props) {
  return (
    <div
      className="flex-1 overflow-y-auto px-5 py-6 space-y-0.5"
      style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
    >
      {lines.map((line, i) =>
        line.trim() === '' ? (
          <div key={i} className="h-4" />
        ) : (
          <p key={i} className="text-gray-800 dark:text-gray-200">
            {line}
          </p>
        )
      )}
    </div>
  )
}
