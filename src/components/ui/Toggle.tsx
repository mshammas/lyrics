'use client'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  id?: string
}

export default function Toggle({ checked, onChange, label, id }: ToggleProps) {
  const innerId = id ?? 'toggle'
  return (
    <label htmlFor={innerId} className="flex items-center gap-2 cursor-pointer select-none">
      {label && <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>}
      <div className="relative">
        <input
          id={innerId}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div
          className={`w-10 h-5 rounded-full transition-colors duration-200 ${
            checked ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </div>
    </label>
  )
}
