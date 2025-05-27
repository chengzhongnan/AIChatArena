"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Npc } from "@/types";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import React from "react";

const npcFormSchema = z.object({
  name: z.string().min(2, {
    message: "NPC name must be at least 2 characters.",
  }).max(50, { message: "NPC name must be at most 50 characters."}),
  prompt: z.string().min(10, {
    message: "NPC prompt must be at least 10 characters.",
  }).max(2000, { message: "NPC prompt must be at most 2000 characters."}),
});

type NpcFormValues = z.infer<typeof npcFormSchema>;

interface NpcFormProps {
  npc?: Npc;
  onSubmit: (values: NpcFormValues) => void;
  triggerButton: React.ReactNode;
  dialogTitle: string;
  dialogDescription: string;
  // Add support for initial values (used in NPCManager for editing)
  initialValues?: {
    name: string;
    prompt: string;
  };
}

export function NpcForm({ 
  npc, 
  onSubmit, 
  triggerButton, 
  dialogTitle, 
  dialogDescription,
  initialValues 
}: NpcFormProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Determine the default values based on priority: initialValues > npc > empty
  const getDefaultValues = () => ({
    name: initialValues?.name || npc?.name || "",
    prompt: initialValues?.prompt || npc?.prompt || "",
  });

  const form = useForm<NpcFormValues>({
    resolver: zodResolver(npcFormSchema),
    defaultValues: getDefaultValues(),
  });
  
  // Reset form when dialog opens or when props change
  React.useEffect(() => {
    if (isOpen) {
      const defaultValues = getDefaultValues();
      form.reset(defaultValues);
    }
  }, [isOpen, npc, initialValues, form]);

  // Also reset when initialValues or npc changes while dialog is closed
  React.useEffect(() => {
    if (!isOpen) {
      const defaultValues = getDefaultValues();
      form.reset(defaultValues);
    }
  }, [npc, initialValues, form, isOpen]);

  const handleFormSubmit = (values: NpcFormValues) => {
    onSubmit(values);
    setIsOpen(false); // Close dialog on submit
    
    // Reset to empty form for next use (unless it's an edit dialog)
    if (!npc && !initialValues) {
      form.reset({
        name: "",
        prompt: "",
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form validation errors when closing
      form.clearErrors();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NPC Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Wise Old Wizard" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NPC Character Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the NPC's personality, role, and how they should respond."
                      className="resize-y min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default">
                {npc || initialValues ? "Update NPC" : "Save NPC"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}