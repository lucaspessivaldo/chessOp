import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/**
 * Modal wrapper used to pick lines on small screens
 */
export function LinesDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 border-border-subtle bg-surface-1 p-0 text-text-primary sm:max-w-md">
        <div className="border-b border-border-subtle p-4 pr-12">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description && <DialogDescription className="mt-1 text-xs text-text-secondary">{description}</DialogDescription>}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2 sidebar-scroll">{children}</div>
        {footer && <div className="border-t border-border-subtle p-3">{footer}</div>}
      </DialogContent>
    </Dialog>
  )
}
