import { createFileRoute, Link } from '@tanstack/react-router'
import { Brain, Layout, Swords, Trophy } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/navbar'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-zinc-50 selection:bg-blue-500/30">
      <Navbar />
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[120px]" />
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] rounded-full bg-zinc-900/60 blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative flex items-center justify-center w-full pt-24 pb-28 md:pt-32 md:pb-32 min-h-screen overflow-hidden" style={{ backgroundImage: 'url(/hero-img.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
          <div className="absolute inset-0 bg-black/70"></div>
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800 text-sm text-zinc-400 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
                </span>
                The Future of Opening Preparation
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                Improve your <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-300 via-cyan-300 to-sky-400">
                  Chess Opening Repertoire
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mb-8 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                Understand the plans, master the patterns, and punish every mistake with our spaced-repetition.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <Link
                  to="/openings"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-14 px-10 min-w-[200px] text-lg rounded-sm bg-blue-500 text-white hover:bg-blue-400 transition-all hover:scale-105"
                  )}
                >
                  Get started
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* Value Proposition / Bento Grid */}
        <section className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Complete Opening Mastery
              </h2>
              <p className="text-lg text-zinc-400">
                A comprehensive suite of tools designed to take you from beginner to theory expert.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Large Card */}
              <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-blue-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-br from-blue-500/12 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-sm bg-blue-500/20 flex items-center justify-center mb-6 text-blue-300">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Spaced Repetition System</h3>
                  <p className="text-zinc-400 max-w-md">
                    Our algorithm tracks every move you make. Mistakes are reviewed immediately, while mastered lines are scheduled for review just before you're likely to forget them.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg viewBox="0 0 200 200" className="w-full h-full text-blue-500 fill-current">
                    <path d="M40,160 C40,160 80,80 100,80 C120,80 160,160 160,160" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </div>

              {/* Tall Card */}
              <div className="md:row-span-2 group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-teal-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-br from-teal-500/12 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-sm bg-teal-500/20 flex items-center justify-center mb-6 text-teal-300">
                    <Layout className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Variation Explorer</h3>
                  <p className="text-zinc-400 mb-8">
                    Visualize your repertoire as a tree. See where lines diverge, identify transpositions, and spot gaps in your preparation.
                  </p>
                  <div className="mt-auto relative h-48 w-full rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                    {/* Abstract Tree Visualization */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-teal-400" />
                    <div className="absolute top-12 left-1/3 w-2 h-2 rounded-full bg-zinc-700" />
                    <div className="absolute top-12 right-1/3 w-2 h-2 rounded-full bg-zinc-700" />
                    <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-zinc-800" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="50" y1="12" x2="33" y2="25" strokeWidth="1" />
                      <line x1="50" y1="12" x2="67" y2="25" strokeWidth="1" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Small Card 1 */}
              <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-blue-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-br from-blue-500/12 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-sm bg-blue-500/20 flex items-center justify-center mb-6 text-blue-300">
                    <Swords className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Practice Mode</h3>
                  <p className="text-zinc-400 text-sm">
                    Test your memory against the computer without hints.
                  </p>
                </div>
              </div>

              {/* Small Card 2 */}
              <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-amber-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-br from-amber-500/12 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-sm bg-amber-500/20 flex items-center justify-center mb-6 text-amber-300">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Progress Tracking</h3>
                  <p className="text-zinc-400 text-sm">
                    Visualize your mastery level for each opening.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-900/12" />
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">
                Ready to make your <br />
                <span className="text-blue-300">best move?</span>
              </h2>
              <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto">
                Join thousands of players who have elevated their game with ChessOp.
                Start building your repertoire today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/openings"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-14 px-10 text-lg rounded-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                  )}
                >
                  Get Started Now
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-900 bg-zinc-950 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-sm bg-blue-600 flex items-center justify-center">
                    <Swords className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">ChessOp</span>
                </div>
                <p className="text-sm text-zinc-500">
                  The modern platform for serious chess improvement.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li><Link to="/openings" className="hover:text-blue-400">Openings</Link></li>
                  <li><Link to="/" className="hover:text-blue-400">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Resources</h4>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li><Link to="/" className="hover:text-blue-400">Blog</Link></li>
                  <li><Link to="/" className="hover:text-blue-400">Community</Link></li>
                  <li><Link to="/" className="hover:text-blue-400">Help Center</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li><Link to="/" className="hover:text-blue-400">Privacy</Link></li>
                  <li><Link to="/" className="hover:text-blue-400">Terms</Link></li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-zinc-900 text-center text-sm text-zinc-600">
              © {new Date().getFullYear()} ChessOp. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
