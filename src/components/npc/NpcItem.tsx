"use client";

import type { Npc } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Bot, ShieldCheck } from "lucide-react";
import { NpcAvatar } from "../chat/NpcAvatar";
import { NpcForm } from "./NpcForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NpcItemProps {
  npc: Npc;
  onUpdate: (id: string, values: { name: string; prompt: string }) => void;
  onDelete: (id: string) => void;
}

export function NpcItem({ npc, onUpdate, onDelete }: NpcItemProps) {
  const handleUpdate = (values: { name: string; prompt: string }) => {
    onUpdate(npc.id, values);
  };

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-200 bg-background">
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <NpcAvatar icon={npc.avatar} name={npc.name} bgColor={npc.avatarColor} size="lg" />
        <div className="flex-grow">
          <CardTitle className="text-xl flex items-center gap-2">
            {npc.name}
            {npc.isDefault && <ShieldCheck className="h-5 w-5 text-sky-500" title="Default NPC" />}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">ID: {npc.id}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <p className="text-sm text-foreground/80 line-clamp-3 overflow-hidden text-ellipsis h-[3.75rem]">
          {npc.prompt}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-0">
        <NpcForm
          npc={npc}
          onSubmit={handleUpdate}
          triggerButton={<Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
          dialogTitle="Edit NPC"
          dialogDescription="Modify the details of this NPC."
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the NPC "{npc.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(npc.id)} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
