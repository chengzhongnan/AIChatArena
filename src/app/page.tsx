import { ChatInterface } from '@/components/chat/ChatInterface';
import { NpcManager } from '@/components/npc/NpcManager';

export default function HomePage() {
  return (
    <main className="h-screen flex flex-col relative bg-background overflow-hidden">
      <header className="p-4 border-b shadow-sm bg-card">
        <h1 className="text-2xl font-bold text-primary text-center">NPC Chat Arena</h1>
      </header>
      <div className="flex-grow overflow-hidden">
        <ChatInterface />
      </div>
      <NpcManager />
    </main>
  );
}
