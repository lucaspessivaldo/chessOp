import { useEffect, useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus confirm button when dialog opens
      confirmButtonRef.current?.focus()
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // Trap focus within dialog
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-md rounded-xl bg-surface-1 border border-border-subtle shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none"
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-3 top-3 p-1 rounded-lg hover:bg-surface-2 transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4 text-text-secondary" />
        </button>

        {/* Content */}
        <div className="p-6">
          <h2 id="dialog-title" className="text-lg font-semibold text-text-primary mb-2">
            {title}
          </h2>
          <p className="text-sm text-text-secondary">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-surface-0/50 rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${variant === 'danger'
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'bg-accent-blue text-white hover:bg-accent-blue/90'
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AlertDialogProps {
  isOpen: boolean
  title: string
  message: string
  buttonLabel?: string
  variant?: 'error' | 'warning' | 'info' | 'success'
  onClose: () => void
}

export function AlertDialog({
  isOpen,
  title,
  message,
  buttonLabel = 'OK',
  variant = 'info',
  onClose,
}: AlertDialogProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      buttonRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const variantStyles = {
    error: 'border-red-600/50',
    warning: 'border-yellow-600/50',
    info: 'border-blue-600/50',
    success: 'border-green-600/50',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={`relative w-full max-w-sm rounded-lg bg-surface-1 border-2 shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none ${variantStyles[variant]}`}
      >
        <div className="p-6">
          <h2 id="alert-title" className="text-lg font-semibold text-text-primary mb-2">
            {title}
          </h2>
          <p className="text-sm text-text-secondary">{message}</p>
        </div>

        <div className="flex justify-end px-6 py-4 bg-surface-0/50 rounded-b-lg">
          <button
            ref={buttonRef}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-surface-2 text-text-primary hover:bg-surface-3 rounded-lg transition-colors"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface CreateStudyDialogProps {
  isOpen: boolean
  onConfirm: (data: { name: string; description: string; color: 'white' | 'black' }) => void
  onCancel: () => void
}

export function CreateStudyDialog({
  isOpen,
  onConfirm,
  onCancel,
}: CreateStudyDialogProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<'white' | 'black'>('white')
  const [error, setError] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setColor('white')
      setError('')
      // Focus name input when dialog opens
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // Trap focus within dialog
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name is required')
      nameInputRef.current?.focus()
      return
    }
    onConfirm({ name: trimmedName, description: description.trim(), color })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-study-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-md rounded-xl bg-surface-1 border border-border-subtle shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none"
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-3 top-3 p-1 rounded-lg hover:bg-surface-2 transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4 text-text-secondary" />
        </button>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 id="create-study-title" className="text-lg font-semibold text-text-primary mb-4">
              Create New Opening Study
            </h2>

            {/* Name input */}
            <div className="mb-4">
              <label htmlFor="study-name" className="block text-sm font-medium text-text-secondary mb-1.5">
                Name <span className="text-accent-danger">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="study-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError('')
                }}
                placeholder="e.g., Italian Game"
                className={`w-full rounded-lg bg-surface-0 border py-2 px-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${error ? 'border-accent-danger' : 'border-border-subtle focus:border-accent-blue'
                  }`}
              />
              {error && <p className="mt-1 text-xs text-accent-danger">{error}</p>}
            </div>

            {/* Description input */}
            <div className="mb-4">
              <label htmlFor="study-description" className="block text-sm font-medium text-text-secondary mb-1.5">
                Description <span className="text-text-muted">(optional)</span>
              </label>
              <textarea
                id="study-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this opening..."
                rows={2}
                className="w-full rounded-lg bg-surface-0 border border-border-subtle py-2 px-3 text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue resize-none"
              />
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Playing as
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setColor('white')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-colors ${color === 'white'
                    ? 'border-accent-blue bg-accent-blue/10 text-text-primary'
                    : 'border-border-subtle bg-surface-0 text-text-secondary hover:border-border-strong hover:text-text-secondary'
                    }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white border border-text-muted" />
                  <span className="text-sm font-medium">White</span>
                </button>
                <button
                  type="button"
                  onClick={() => setColor('black')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-colors ${color === 'black'
                    ? 'border-accent-blue bg-accent-blue/10 text-text-primary'
                    : 'border-border-subtle bg-surface-0 text-text-secondary hover:border-border-strong hover:text-text-secondary'
                    }`}
                >
                  <div className="w-4 h-4 rounded-full bg-surface-1 border border-border-strong" />
                  <span className="text-sm font-medium">Black</span>
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-surface-0/50 rounded-b-lg">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/90 rounded-lg transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

