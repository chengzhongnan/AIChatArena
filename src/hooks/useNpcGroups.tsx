import { useState, useCallback } from 'react';
import { NpcGroup } from '@/types';

export function useNpcGroups() {
  const [groups, setGroups] = useState<NpcGroup[]>([]);

  const addGroup = useCallback((name: string): string => {
    const newGroup: NpcGroup = {
      id: crypto.randomUUID(),
      name,
      npcIds: [],
      createdAt: new Date(),
    };
    setGroups(prev => [...prev, newGroup]);
    return newGroup.id;
  }, []);

  const updateGroup = useCallback((id: string, name: string) => {
    setGroups(prev => 
      prev.map(group => 
        group.id === id ? { ...group, name } : group
      )
    );
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => prev.filter(group => group.id !== id));
  }, []);

  const addNpcToGroup = useCallback((groupId: string, npcId: string) => {
    setGroups(prev =>
      prev.map(group =>
        group.id === groupId && !group.npcIds.includes(npcId)
          ? { ...group, npcIds: [...group.npcIds, npcId] }
          : group
      )
    );
  }, []);

  const removeNpcFromGroup = useCallback((groupId: string, npcId: string) => {
    setGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? { ...group, npcIds: group.npcIds.filter(id => id !== npcId) }
          : group
      )
    );
  }, []);

  const moveNpcBetweenGroups = useCallback((npcId: string, fromGroupId: string, toGroupId: string) => {
    setGroups(prev =>
      prev.map(group => {
        if (group.id === fromGroupId) {
          return { ...group, npcIds: group.npcIds.filter(id => id !== npcId) };
        }
        if (group.id === toGroupId && !group.npcIds.includes(npcId)) {
          return { ...group, npcIds: [...group.npcIds, npcId] };
        }
        return group;
      })
    );
  }, []);

  return {
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    addNpcToGroup,
    removeNpcFromGroup,
    moveNpcBetweenGroups,
  };
}