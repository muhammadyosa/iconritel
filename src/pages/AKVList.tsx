import { useState, useEffect } from "react";
import { Download, FileText, Info, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { AKV } from "@/types/akv";
import { loadAKVData, saveAKVData } from "@/lib/indexedDB";
import { sanitizeForCSV } from "@/lib/validation";

const AKV_FIELDS = [
  { value: "all", label: "Semua Field" },
  { value: "namaUser", label: "Nama User" },
  { value: "usernameAkv", label: "Username AKV" },
  { value: "area", label: "Area" },
];

const AKVList = () => {
  const [akvData, setAkvData] = useState<AKV[]>([]);
  const [searchField, setSearchField] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAkv, setEditingAkv] = useState<AKV | null>(null);
  const [formData, setFormData] = useState({
    namaUser: "",
    usernameAkv: "",
    passwordAkv: "",
    area: "",
  });

  useEffect(() => {
    loadAKVData()
      .then((data) => {
        setAkvData(data);
        setIsLoading(false);
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error("Error loading AKV data:", error);
        }
        setIsLoading(false);
      });
  }, []);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data untuk diekspor.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredData.map((akv) => ({
      "Nama User": sanitizeForCSV(akv.namaUser),
      "Username AKV": sanitizeForCSV(akv.usernameAkv),
      "Password AKV": sanitizeForCSV(akv.passwordAkv),
      "Area": sanitizeForCSV(akv.area),
      "Tanggal Dibuat": sanitizeForCSV(new Date(akv.createdAt).toLocaleString("id-ID")),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "List AKV User");
    XLSX.writeFile(wb, `List_AKV_User_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Export berhasil",
      description: "Data AKV User berhasil diekspor ke Excel.",
    });
  };

  const handleSubmit = async () => {
    if (!formData.namaUser || !formData.usernameAkv || !formData.passwordAkv) {
      toast({
        title: "Validasi gagal",
        description: "Nama User, Username AKV, dan Password AKV wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    try {
      let updatedData: AKV[];
      
      if (editingAkv) {
        // Update existing
        updatedData = akvData.map((akv) =>
          akv.id === editingAkv.id
            ? { ...akv, ...formData }
            : akv
        );
        toast({
          title: "Berhasil diupdate",
          description: "Data AKV User berhasil diperbarui.",
        });
      } else {
        // Add new
        const newAkv: AKV = {
          id: crypto.randomUUID(),
          ...formData,
          createdAt: new Date().toISOString(),
        };
        updatedData = [...akvData, newAkv];
        toast({
          title: "Berhasil ditambahkan",
          description: "Data AKV User baru berhasil ditambahkan.",
        });
      }

      await saveAKVData(updatedData);
      setAkvData(updatedData);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (akv: AKV) => {
    setEditingAkv(akv);
    setFormData({
      namaUser: akv.namaUser,
      usernameAkv: akv.usernameAkv,
      passwordAkv: akv.passwordAkv,
      area: akv.area,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const updatedData = akvData.filter((akv) => akv.id !== id);
      await saveAKVData(updatedData);
      setAkvData(updatedData);
      toast({
        title: "Berhasil dihapus",
        description: "Data AKV User berhasil dihapus.",
      });
    } catch (error) {
      toast({
        title: "Gagal menghapus",
        description: "Terjadi kesalahan saat menghapus data.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      namaUser: "",
      usernameAkv: "",
      passwordAkv: "",
      area: "",
    });
    setEditingAkv(null);
  };

  const filteredData = akvData.filter((akv) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    if (searchField === "all") {
      return (
        String(akv.namaUser || "").toLowerCase().includes(query) ||
        String(akv.usernameAkv || "").toLowerCase().includes(query) ||
        String(akv.area || "").toLowerCase().includes(query)
      );
    }
    
    const fieldValue = String(akv[searchField as keyof AKV] || "").toLowerCase();
    return fieldValue.includes(query);
  });

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">🗂️ List AKV User</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Kelola data AKV User untuk akses sistem
        </p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <span className="text-sm sm:text-base">🗂️ Data AKV User</span>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-normal mt-0.5 sm:mt-1">
                {isLoading ? (
                  "Memuat data AKV..."
                ) : akvData.length > 0 ? (
                  `✓ ${akvData.length} data AKV User tersimpan`
                ) : (
                  <span className="flex items-center gap-1 flex-wrap">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span>Belum ada data. Klik tombol Tambah untuk menambah data.</span>
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 touch-target"
                  >
                    <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Tambah</span>
                    <span className="xs:hidden">+</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingAkv ? "Edit AKV User" : "Tambah AKV User"}</DialogTitle>
                    <DialogDescription>
                      {editingAkv ? "Perbarui data AKV User" : "Tambahkan data AKV User baru"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="namaUser">Nama User *</Label>
                      <Input
                        id="namaUser"
                        value={formData.namaUser}
                        onChange={(e) => setFormData({ ...formData, namaUser: e.target.value })}
                        placeholder="Masukkan nama user"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="usernameAkv">Username AKV *</Label>
                      <Input
                        id="usernameAkv"
                        value={formData.usernameAkv}
                        onChange={(e) => setFormData({ ...formData, usernameAkv: e.target.value })}
                        placeholder="Masukkan username AKV"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="passwordAkv">Password AKV *</Label>
                      <Input
                        id="passwordAkv"
                        type="password"
                        value={formData.passwordAkv}
                        onChange={(e) => setFormData({ ...formData, passwordAkv: e.target.value })}
                        placeholder="Masukkan password AKV"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="area">Area</Label>
                      <Input
                        id="area"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        placeholder="Masukkan area (opsional)"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleSubmit}>
                      {editingAkv ? "Simpan Perubahan" : "Tambah"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={filteredData.length === 0}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 touch-target"
              >
                <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Export Excel</span>
                <span className="xs:hidden">Export</span>
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-xs hidden sm:block">
            Kolom: Nama User, Username AKV, Password AKV, Area
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 md:space-y-4 p-2 sm:p-4 md:p-6">
          {/* Search & Filter */}
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 items-stretch xs:items-center">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="w-full xs:w-[140px] sm:w-[180px] h-7 sm:h-9 bg-background text-[10px] sm:text-sm">
                  <SelectValue placeholder="Pilih Field" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {AKV_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value} className="text-[10px] sm:text-sm">
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full sm:max-w-md">
              <Input
                placeholder={`Cari ${AKV_FIELDS.find(f => f.value === searchField)?.label || "data"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 sm:h-9 text-[10px] sm:text-sm"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto max-h-72 sm:max-h-96 -mx-2 sm:mx-0">
            <Table className="text-[10px] sm:text-xs min-w-[600px]">
              <TableHeader>
                <TableRow className="h-6 sm:h-8">
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap">Nama User</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap">Username AKV</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap">Password AKV</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap">Area</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground px-1 sm:px-2 py-1">
                      Memuat data AKV...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground px-1 sm:px-2 py-1">
                      {akvData.length === 0
                        ? "Belum ada data AKV User. Klik tombol Tambah untuk menambahkan."
                        : "Tidak ada data yang sesuai dengan pencarian."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.slice(0, 100).map((akv) => (
                    <TableRow key={akv.id} className="h-6 sm:h-8">
                      <TableCell className="px-1 sm:px-2 py-0.5 sm:py-1">{akv.namaUser}</TableCell>
                      <TableCell className="font-mono px-1 sm:px-2 py-0.5 sm:py-1">{akv.usernameAkv}</TableCell>
                      <TableCell className="font-mono px-1 sm:px-2 py-0.5 sm:py-1">
                        <span className="blur-sm hover:blur-none transition-all cursor-pointer">
                          {akv.passwordAkv}
                        </span>
                      </TableCell>
                      <TableCell className="px-1 sm:px-2 py-0.5 sm:py-1">{akv.area || "-"}</TableCell>
                      <TableCell className="px-1 sm:px-2 py-0.5 sm:py-1">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleEdit(akv)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Data AKV User?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Anda yakin ingin menghapus data AKV User "{akv.namaUser}"? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(akv.id)}>
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
            {filteredData.length > 100 ? (
              <span className="hidden sm:inline">Menampilkan 100 dari {filteredData.length} hasil pencarian (Total: {akvData.length} data AKV)</span>
            ) : (
              <span className="hidden sm:inline">Total: {filteredData.length} dari {akvData.length} data AKV User</span>
            )}
            <span className="sm:hidden">
              {filteredData.length > 100 ? `100/${filteredData.length}` : `${filteredData.length}/${akvData.length}`} data
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AKVList;
