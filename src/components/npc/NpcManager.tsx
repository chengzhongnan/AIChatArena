"use client";
import { useNpcs } from "@/hooks/useNpcs";
import { useNpcGroups } from "@/hooks/useNpcGroups";
import { Button } from "@/components/ui/button";
import { PlusCircle, Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { NpcList } from "./NpcList";
import { NpcForm } from "./NpcForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";
import { SettingsDropdownMenu, SettingsDropdownMenuContent } from "../ui/settings-dropdown-menu";
import { NpcGroup, Npc } from "@/types";

export function NpcManager() {
  const { npcs, addNpc, updateNpc, deleteNpc } = useNpcs();
  const { groups, addGroup, updateGroup, deleteGroup, addNpcToGroup, removeNpcFromGroup } = useNpcGroups();
  const [isManageNpcsOpen, setIsManageNpcsOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleAddNpc = (values: { name: string; prompt: string }, groupId?: string) => {
    const npc = addNpc(values.name, values.prompt);
    if (groupId && npc) {
      addNpcToGroup(groupId, npc.id);
    }
  };

  const handleUpdateNpc = (id: string, values: { name: string; prompt: string }) => {
    updateNpc(id, values);
  };

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      addGroup(newGroupName.trim());
      setNewGroupName("");
    }
  };

  const handleUpdateGroup = (groupId: string) => {
    if (editingGroupName.trim()) {
      updateGroup(groupId, editingGroupName.trim());
      setEditingGroupId(null);
      setEditingGroupName("");
    }
  };

  const startEditingGroup = (group: NpcGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroupNpcs = (groupId: string): Npc[] => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    return npcs.filter(npc => group.npcIds.includes(npc.id));
  };

  const getUngroupedNpcs = (): Npc[] => {
    const allGroupedNpcIds = groups.flatMap(group => group.npcIds);
    return npcs.filter(npc => !allGroupedNpcIds.includes(npc.id));
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-4">
        <SettingsDropdownMenu>
          <Dialog open={isManageNpcsOpen} onOpenChange={setIsManageNpcsOpen}>
            <DialogTrigger asChild>
              <SettingsDropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => setIsManageNpcsOpen(true)}
                  className="cursor-pointer"
                >
                  管理 NPC
                </DropdownMenuItem>
              </SettingsDropdownMenuContent>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-[95vw] h-[95vh] flex flex-col p-0 bg-card">
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle className="text-2xl">NPC Management</DialogTitle>
                <DialogDescription>
                  Create, view, edit, and delete NPC characters and groups.
                </DialogDescription>
              </DialogHeader>

              {/* NPC Groups Section */}
              <div className="px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">NPC Groups</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New group name..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-48"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddGroup()}
                    />
                    <Button onClick={handleAddGroup} size="sm" disabled={!newGroupName.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {groups.map((group) => (
                    <Collapsible
                      key={group.id}
                      open={expandedGroups.has(group.id)}
                      onOpenChange={() => toggleGroupExpansion(group.id)}
                    >
                      <div className="flex items-center justify-between p-2 rounded-md border bg-background">
                        <div className="flex items-center gap-2 flex-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                              {expandedGroups.has(group.id) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          
                          {editingGroupId === group.id ? (
                            <Input
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              className="h-6 text-sm flex-1 mr-2"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') handleUpdateGroup(group.id);
                                if (e.key === 'Escape') {
                                  setEditingGroupId(null);
                                  setEditingGroupName("");
                                }
                              }}
                              onBlur={() => handleUpdateGroup(group.id)}
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium flex-1">
                              {group.name} ({group.npcIds.length} NPCs)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <NpcForm
                            onSubmit={(values) => handleAddNpc(values, group.id)}
                            triggerButton={
                              <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                                <Plus className="h-3 w-3" />
                              </Button>
                            }
                            dialogTitle={`Add NPC to ${group.name}`}
                            dialogDescription={`Create a new NPC character for the ${group.name} group.`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-6 w-6"
                            onClick={() => startEditingGroup(group)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => deleteGroup(group.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <CollapsibleContent className="ml-6 mt-1">
                        <div className="space-y-1">
                          {getGroupNpcs(group.id).map((npc) => (
                            <div key={npc.id} className="flex items-center justify-between p-2 text-sm bg-muted/50 rounded">
                              <span>{npc.name}</span>
                              <div className="flex gap-1">
                                <NpcForm
                                  onSubmit={(values) => handleUpdateNpc(npc.id, values)}
                                  triggerButton={
                                    <Button variant="ghost" size="sm" className="p-1 h-5 w-5">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  }
                                  dialogTitle="Edit NPC"
                                  dialogDescription="Modify the NPC character details."
                                  initialValues={{ name: npc.name, prompt: npc.prompt }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-5 w-5"
                                  onClick={() => removeNpcFromGroup(group.id, npc.id)}
                                  title="Remove from group"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>

              {/* All NPCs Section */}
              <div className="flex-grow overflow-hidden flex flex-col">
                <div className="px-6 py-2 border-b">
                  <h3 className="text-lg font-semibold">
                    All NPCs ({npcs.length})
                    {getUngroupedNpcs().length > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({getUngroupedNpcs().length} ungrouped)
                      </span>
                    )}
                  </h3>
                </div>
                <div className="flex-grow overflow-hidden px-6 py-4">
                  <NpcList npcs={npcs} onUpdateNpc={handleUpdateNpc} onDeleteNpc={deleteNpc} />
                </div>
              </div>

              <div className="p-6 border-t mt-auto">
                <NpcForm
                  onSubmit={(values) => handleAddNpc(values)}
                  triggerButton={
                    <Button variant="default" className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New NPC
                    </Button>
                  }
                  dialogTitle="Add New NPC"
                  dialogDescription="Define a new NPC character for the chat arena."
                />
              </div>
            </DialogContent>
          </Dialog>
        </SettingsDropdownMenu>
      </div>
    </div>
  );
}