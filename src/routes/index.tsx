import { createFileRoute, Link } from '@tanstack/react-router'
import { Puzzle, BookOpen, Target, Zap } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <h1 className="text-5xl font-bold text-white mb-4">ChessOp</h1>
        <p className="text-xl text-zinc-400 mb-12 text-center max-w-xl">
          Master chess openings through practice and repetition. Train your mind, sharpen your game.
        </p>

        {/* Main CTA */}
        <Link
          to="/puzzles"
          className="mb-16 flex items-center gap-3 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          <Puzzle className="h-6 w-6" />
          Start Training
        </Link>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <FeatureCard
            icon={<Target className="h-8 w-8 text-blue-500" />}
            title="Puzzle Training"
            description="Solve tactical puzzles rated from beginner to master level. Learn from your mistakes."
          />
          <FeatureCard
            icon={<BookOpen className="h-8 w-8 text-green-500" />}
            title="Opening Lines"
            description="Study and memorize opening variations. Build your repertoire one move at a time."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-yellow-500" />}
            title="Unlimited Retries"
            description="Made a wrong move? No problem. Keep trying until you find the best move."
          />
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-zinc-800/50 py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-white">1000+</p>
            <p className="text-zinc-400">Puzzles</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">400-3000</p>
            <p className="text-zinc-400">Rating Range</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">Free</p>
            <p className="text-zinc-400">Forever</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-lg bg-zinc-800 p-6 text-center">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  )
}
