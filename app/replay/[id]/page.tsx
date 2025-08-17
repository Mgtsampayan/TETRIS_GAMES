import { ReplayViewer } from '@/components/ReplayViewer';

interface ReplayPageProps {
    params: Promise<{ id: string }>;
}

export default async function ReplayPage({ params }: ReplayPageProps) {
    const { id } = await params;

    // In a real app, fetch replay data from API
    const replayData = {
        id,
        title: 'Epic Comeback vs TetrisGod',
        players: ['You', 'TetrisGod'],
        duration: 180000, // 3 minutes
        date: new Date('2025-01-15'),
        frames: [], // Replay frames would be loaded here
        seed: 12345
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <ReplayViewer replay={replayData} />
        </div>
    );
}