"use client";

import type { Npc } from "@/types";
import { NpcItem } from "./NpcItem";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NpcListProps {
  npcs: Npc[];
  onUpdateNpc: (id: string, values: { name: string; prompt: string }) => void;
  onDeleteNpc: (id: string) => void;
}

export function NpcList({ npcs, onUpdateNpc, onDeleteNpc }: NpcListProps) {
  if (npcs.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No NPCs configured yet. Add one to get started!</p>;
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)] md:h-[calc(80vh-150px)] p-1"> {/* Adjusted height */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {npcs.map((npc) => (
          <NpcItem
            key={npc.id}
            npc={npc}
            onUpdate={onUpdateNpc}
            onDelete={onDeleteNpc}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
