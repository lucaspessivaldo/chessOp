interface CommentPanelProps {
  comment: string | null
  className?: string
}

export function CommentPanel({ comment, className = '' }: CommentPanelProps) {
  if (!comment) {
    return (
      <div className={`rounded-md bg-zinc-700/30 p-4 ${className}`}>
        <p className="text-sm text-zinc-500 italic">
          No commentary for this position
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-md bg-zinc-700/50 p-4 ${className}`}>
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
        {comment}
      </p>
    </div>
  )
}
