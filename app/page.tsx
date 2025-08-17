import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { GameModeCard } from '@/components/GameModeCard';
import { LeaderboardPreview } from '@/components/LeaderboardPreview';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 container mx-auto px-4 py-20 text-center text-white">
          <h1 className="text-6xl font-bold mb-6 animate-pulse">
            Tetris <span className="text-yellow-400">Battle</span>
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Experience the ultimate multiplayer falling-blocks battle.
            Compete with players worldwide in fast-paced, strategic gameplay.
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/play">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                Play Now
              </Button>
            </Link>
            <Link href="/ranked">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                Ranked Mode
              </Button>
            </Link>
          </div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute top-10 left-10 w-8 h-8 bg-cyan-400 opacity-50 animate-bounce"></div>
        <div className="absolute top-20 right-20 w-6 h-6 bg-yellow-400 opacity-50 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-10 h-10 bg-purple-400 opacity-50 animate-spin"></div>
        <div className="absolute bottom-10 right-10 w-4 h-4 bg-green-400 opacity-50 animate-ping"></div>
      </section>

      {/* Game Modes */}
      <section className="py-20 bg-gray-900 bg-opacity-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            Choose Your Battle
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GameModeCard
              title="1v1 Ranked"
              description="Climb the ladder in intense 1-on-1 battles"
              icon="⚔️"
              href="/ranked"
              gradient="from-red-500 to-pink-500"
            />
            <GameModeCard
              title="6-Player Battle"
              description="Survive the chaos of multiplayer mayhem"
              icon="👥"
              href="/battle"
              gradient="from-blue-500 to-purple-500"
            />
            <GameModeCard
              title="Sprint"
              description="Race to clear 40 lines as fast as possible"
              icon="🏃"
              href="/sprint"
              gradient="from-green-500 to-teal-500"
            />
            <GameModeCard
              title="Custom Rooms"
              description="Create or join custom games with friends"
              icon="🎮"
              href="/rooms"
              gradient="from-yellow-500 to-orange-500"
            />
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            Top Players
          </h2>
          <LeaderboardPreview />

          <div className="text-center mt-8">
            <Link href="/leaderboards">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                View Full Leaderboards
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black bg-opacity-50 py-8 text-white text-center">
        <div className="container mx-auto px-4">
          <p>&copy; 2025 Tetris Battle. Built with Next.js 15 and modern web technologies.</p>
        </div>
      </footer>
    </div>
  );
}