import { useState, useEffect } from 'react'
import type { OpeningStudy } from '@/types/opening'
import { loadOpeningStudies, deleteOpeningStudy } from '@/lib/opening-utils'
import { Search, Plus, Trash2 } from 'lucide-react'
import { OpeningSelectorSkeleton } from '@/components/ui/skeleton'
import { ConfirmDialog, CreateStudyDialog } from '@/components/ui/custom-dialog'

interface OpeningSelectorProps {
  onSelect: (study: OpeningStudy) => void
  onCreateNew: (data: { name: string; description: string; color: 'white' | 'black' }) => void
}

export function OpeningSelector({ onSelect, onCreateNew }: OpeningSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all')
  const [customStudies, setCustomStudies] = useState<OpeningStudy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; studyId: string | null }>({
    isOpen: false,
    studyId: null,
  })

  // Load studies with simulated loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomStudies(loadOpeningStudies())
      setIsLoading(false)
    }, 300) // Small delay for loading state visibility
    return () => clearTimeout(timer)
  }, [])

  // Filter custom studies
  const filteredStudies = customStudies.filter(study => {
    if (colorFilter !== 'all' && study.color !== colorFilter) return false
    if (searchQuery && !study.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleDeleteStudy = (id: string) => {
    setDeleteConfirm({ isOpen: true, studyId: id })
  }

  const confirmDelete = () => {
    if (deleteConfirm.studyId) {
      deleteOpeningStudy(deleteConfirm.studyId)
      setCustomStudies(loadOpeningStudies())
    }
    setDeleteConfirm({ isOpen: false, studyId: null })
  }

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, studyId: null })
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Create Study Dialog */}
      <CreateStudyDialog
        isOpen={showCreateDialog}
        onConfirm={(data) => {
          setShowCreateDialog(false)
          onCreateNew(data)
        }}
        onCancel={() => setShowCreateDialog(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Opening Study"
        message="Are you sure you want to delete this opening study? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search openings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-surface-1 border border-border-subtle py-2 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          />
        </div>

        {/* Color filter */}
        <div className="flex rounded-lg bg-surface-1 border border-border-subtle p-1">
          <button
            onClick={() => setColorFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${colorFilter === 'all' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setColorFilter('white')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${colorFilter === 'white' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            White
          </button>
          <button
            onClick={() => setColorFilter('black')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${colorFilter === 'black' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            Black
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <OpeningSelectorSkeleton />
      ) : (
        <div className="space-y-2">
          {/* Create new button */}
          <button
            onClick={() => setShowCreateDialog(true)}
            className="w-full text-left rounded-xl border-2 border-dashed border-border-subtle hover:border-accent-blue/50 p-5 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            <div className="flex items-center justify-center gap-2 text-text-muted group-hover:text-accent-blue">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create New Opening Study</span>
            </div>
          </button>

          {/* Studies list */}
          {filteredStudies.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-surface-1 flex items-center justify-center mx-auto mb-4">
                <Search className="h-7 w-7 text-text-muted" />
              </div>
              <p className="text-text-secondary font-medium mb-1">
                {customStudies.length === 0
                  ? "No opening studies yet"
                  : "No openings match your filters"}
              </p>
              <p className="text-sm text-text-muted">
                {customStudies.length === 0
                  ? "Create your first study to start building your repertoire."
                  : "Try adjusting your search or filter."}
              </p>
            </div>
          ) : (
            filteredStudies.map((study) => (
              <div
                key={study.id}
                className="flex items-center gap-2 rounded-xl bg-surface-1 hover:bg-surface-2 border border-border-subtle hover:border-border-strong p-4 transition-all group"
              >
                <button
                  onClick={() => onSelect(study)}
                  className="flex-1 text-left focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {/* Color indicator */}
                      <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${study.color === 'white'
                        ? 'bg-zinc-100 text-zinc-800'
                        : 'bg-surface-2 text-text-primary border border-border-strong'
                        }`}>
                        {study.color === 'white' ? '♔' : '♚'}
                      </div>
                      <div>
                        <h3 className="font-medium text-text-primary group-hover:text-accent-blue transition-colors">
                          {study.name}
                        </h3>
                        {study.description && (
                          <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                            {study.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteStudy(study.id)}
                  className="p-2 text-text-muted hover:text-accent-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-danger rounded-lg"
                  title="Delete opening"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
