import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItemProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  icon?: React.ReactNode
  badge?: React.ReactNode
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  icon,
  badge,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0)

  useEffect(() => {
    if (isOpen) {
      const contentHeight = contentRef.current?.scrollHeight
      setHeight(contentHeight)
      // After animation, set to auto for dynamic content
      const timer = setTimeout(() => setHeight(undefined), 200)
      return () => clearTimeout(timer)
    } else {
      // First set to current height, then animate to 0
      const contentHeight = contentRef.current?.scrollHeight
      setHeight(contentHeight)
      requestAnimationFrame(() => {
        setHeight(0)
      })
    }
  }, [isOpen])

  return (
    <div className="rounded-sm bg-zinc-800 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-750 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-zinc-400">{icon}</span>}
          <span className="text-sm font-medium text-zinc-300">{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>
      <div
        ref={contentRef}
        style={{ height: height !== undefined ? `${height}px` : 'auto' }}
        className="overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none"
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}

interface AccordionProps {
  children: React.ReactNode
  className?: string
}

export function Accordion({ children, className = '' }: AccordionProps) {
  return <div className={`space-y-2 ${className}`}>{children}</div>
}
