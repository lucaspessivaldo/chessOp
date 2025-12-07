import { useState } from 'react'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  children: (activeTab: string) => React.ReactNode
  className?: string
}

export function Tabs({ tabs, defaultTab, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  return (
    <div className={className}>
      <div className="flex border-b border-zinc-700 mb-4" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{children(activeTab)}</div>
    </div>
  )
}

interface TabContentProps {
  children: React.ReactNode
  className?: string
}

export function TabContent({ children, className = '' }: TabContentProps) {
  return <div className={className}>{children}</div>
}
