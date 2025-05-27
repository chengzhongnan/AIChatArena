import React from 'react';
import { NpcGroup } from '@/types';

interface NpcGroupListProps {
  groups: NpcGroup[];
}

export function NpcGroupList({ groups }: NpcGroupListProps) {
  return (
    <div>
      <h2>NPC Groups</h2>
      <ul>
        {groups.map(group => (
          <li key={group.id}>{group.name}</li>
        ))}
      </ul>
    </div>
  );
}