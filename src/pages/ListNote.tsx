import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Trash2, Edit2, Save, X, Loader2 } from "lucide-react";
import { NotesSkeleton } from "@/components/PageSkeleton";
import { useCloudNotes } from "@/hooks/useCloudNotes";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const TABS = [
  { value: "bng-upe", label: "🛰 BNG & UPE" },
  { value: "huawei", label: "📟 Huawei" },
  { value: "raisecom", label: "📟 Raisecom" },
  { value: "handling-incident", label: "📒 Handling Incident" },
];

function NoteSection({ tabKey }: { tabKey: string }) {
  const { notes, isLoading, addNote, updateNote, deleteNote } = useCloudNotes(tabKey);
  const { isAdmin } = useUserRole();
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      toast.error("Judul tidak boleh kosong");
      return;
    }
    const ok = await addNote(newTitle, newContent);
    if (ok) {
      setNewTitle("");
      setNewContent("");
      setShowForm(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error("Judul tidak boleh kosong");
      return;
    }
    if (editingId) {
      const ok = await updateNote(editingId, editTitle, editContent);
      if (ok) setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error("Hanya Admin yang dapat menghapus note");
      return;
    }
    await deleteNote(id);
  };

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="h-9 gap-1.5">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Batal" : "Tambah Note"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder="Judul note"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-9 text-sm"
            />
            <Textarea
              placeholder="Isi note..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="text-sm min-h-[80px]"
            />
            <Button size="sm" onClick={handleAdd} className="h-8 gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Simpan
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          {notes.length === 0 ? "Belum ada note. Tambahkan note pertama!" : "Tidak ada note yang cocok."}
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map((note) => (
            <Card key={note.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-3">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-sm font-medium"
                    />
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={handleSaveEdit} className="h-7 gap-1 text-xs">
                        <Save className="h-3 w-3" /> Simpan
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold truncate">{note.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {note.created_by_name && (
                            <span className="font-medium">{note.created_by_name} · </span>
                          )}
                          {new Date(note.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditTitle(note.title);
                            setEditContent(note.content);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(note.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {note.content && (
                      <p className="text-sm text-foreground/80 mt-1.5 whitespace-pre-wrap break-words">
                        {note.content}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListNote() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold">📖 List Configure</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Catatan berdasarkan kategori perangkat</p>
      </div>

      <Tabs defaultValue="bng-upe" className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto sm:h-9 gap-0.5">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-3">
            <NoteSection tabKey={tab.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
