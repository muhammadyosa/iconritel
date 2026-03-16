import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CloudNote {
  id: string;
  tab_key: string;
  title: string;
  content: string;
  created_by_user_id: string;
  created_by_name: string | null;
  created_at: string;
}

export function useCloudNotes(tabKey: string) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CloudNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("tab_key", tabKey)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return;
    }
    setNotes(data || []);
    setIsLoading(false);
  }, [tabKey]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`notes-${tabKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `tab_key=eq.${tabKey}` },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tabKey, fetchNotes]);

  const addNote = async (title: string, content: string) => {
    if (!user) return false;
    const { error } = await supabase.from("notes").insert({
      tab_key: tabKey,
      title: title.trim(),
      content: content.trim(),
      created_by_user_id: user.id,
      created_by_name: user.user_metadata?.full_name || user.email || null,
    });
    if (error) {
      toast.error("Gagal menambahkan note");
      return false;
    }
    toast.success("Note ditambahkan");
    return true;
  };

  const updateNote = async (id: string, title: string, content: string) => {
    const { error } = await supabase
      .from("notes")
      .update({ title: title.trim(), content: content.trim() })
      .eq("id", id);
    if (error) {
      toast.error("Gagal memperbarui note");
      return false;
    }
    toast.success("Note diperbarui");
    return true;
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("Hanya Admin yang dapat menghapus note");
      } else {
        toast.error("Gagal menghapus note");
      }
      return false;
    }
    toast.success("Note dihapus");
    return true;
  };

  return { notes, isLoading, addNote, updateNote, deleteNote };
}
