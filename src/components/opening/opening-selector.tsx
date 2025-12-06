import { useState } from 'react'
import type { OpeningStudy } from '@/types/opening'
import { loadOpeningStudies, deleteOpeningStudy } from '@/lib/opening-utils'
import { Search, Plus, Trash2 } from 'lucide-react'

interface OpeningSelectorProps {
  onSelect: (study: OpeningStudy) => void
  onCreateNew: () => void
}

export function OpeningSelector({ onSelect, onCreateNew }: OpeningSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all')
  const [customStudies, setCustomStudies] = useState(() => loadOpeningStudies())

  // Filter custom studies
  const filteredStudies = customStudies.filter(study => {
    if (colorFilter !== 'all' && study.color !== colorFilter) return false
    if (searchQuery && !study.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleDeleteStudy = (id: string) => {
    if (confirm('Are you sure you want to delete this opening study?')) {
      deleteOpeningStudy(id)
      setCustomStudies(loadOpeningStudies())
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Filters */}
      <div className="flex gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search openings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Color filter */}
        <div className="flex rounded-md bg-zinc-800 border border-zinc-700 p-1">
          <button
            onClick={() => setColorFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${colorFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setColorFilter('white')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${colorFilter === 'white' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
          >
            White
          </button>
          <button
            onClick={() => setColorFilter('black')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${colorFilter === 'black' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
          >
            Black
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Create new button */}
        <button
          onClick={onCreateNew}
          className="w-full text-left rounded-lg border-2 border-dashed border-zinc-700 hover:border-blue-500 p-4 transition-colors group"
        >
          <div className="flex items-center justify-center gap-2 text-zinc-400 group-hover:text-blue-400">
            <Plus className="h-5 w-5" />
            <span className="font-medium">Create New Opening Study</span>
          </div>
        </button>

        {/* Studies list */}
        {filteredStudies.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">
            {customStudies.length === 0
              ? "You haven't created any opening studies yet"
              : "No openings match your filters"}
          </p>
        ) : (
          filteredStudies.map((study) => (
            <div
              key={study.id}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 p-4 transition-colors group"
            >
              <button
                onClick={() => onSelect(study)}
                className="flex-1 text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {study.name}
                    </h3>
                    {study.description && (
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                        {study.description}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${study.color === 'white'
                    ? 'bg-zinc-200 text-zinc-800'
                    : 'bg-zinc-900 text-zinc-200'
                    }`}>
                    {study.color}
                  </span>
                </div>
              </button>
              <button
                onClick={() => handleDeleteStudy(study.id)}
                className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                title="Delete opening"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
