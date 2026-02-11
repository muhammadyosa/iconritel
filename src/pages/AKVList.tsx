import { useState, useEffect } from "react";
import { Download, FileText, Info, Link, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { AKV } from "@/types/akv";
import { loadAKVData } from "@/lib/indexedDB";
import { sanitizeForCSV } from "@/lib/validation";

const AKV_FIELDS = [
  { value: "all", label: "Semua Field" },
  { value: "provinsi", label: "Provinsi" },
  { value: "customer", label: "Customer" },
  { value: "serviceId", label: "Service ID" },
  { value: "contact", label: "Contact" },
];

const AKVList = () => {
  const [akvData, setAkvData] = useState<AKV[]>([]);
  const [searchField, setSearchField] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const buildExportData = () => {
    return filteredData.map((akv) => ({
      "Provinsi": sanitizeForCSV(akv.provinsi),
      "Customer": sanitizeForCSV(akv.customer),
      "Service ID": sanitizeForCSV(akv.serviceId),
      "Tikor": sanitizeForCSV(akv.tikor),
      "Contact": sanitizeForCSV(akv.contact),
      "Address": sanitizeForCSV(akv.address),
    }));
  };

  const handleExportExcel = () => {
    const exportData = buildExportData();
    if (exportData.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada data untuk diekspor.", variant: "destructive" });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "List AKV User");
    XLSX.writeFile(wb, `List_AKV_User_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Export berhasil", description: "Data AKV User berhasil diekspor ke Excel." });
  };

  const handleExportCSV = () => {
    const exportData = buildExportData();
    if (exportData.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada data untuk diekspor.", variant: "destructive" });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `List_AKV_User_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export berhasil", description: "Data AKV User berhasil diekspor ke CSV." });
  };

  const filteredData = akvData.filter((akv) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    if (searchField === "all") {
      return (
        String(akv.provinsi || "").toLowerCase().includes(query) ||
        String(akv.customer || "").toLowerCase().includes(query) ||
        String(akv.serviceId || "").toLowerCase().includes(query) ||
        String(akv.contact || "").toLowerCase().includes(query) ||
        String(akv.address || "").toLowerCase().includes(query)
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
          Data pelanggan AKV dengan informasi lokasi dan kontak
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
                    <span>Belum ada data. Import melalui </span>
                    <a href="/settings" className="text-primary hover:underline inline-flex items-center gap-0.5">
                      <Link className="h-3 w-3" />
                      Settings
                    </a>
                  </span>
                )}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={filteredData.length === 0} className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 touch-target">
                  <FileDown className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Excel / CSV</span>
                  <span className="xs:hidden">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-xs hidden sm:block">
            Kolom: Provinsi, Customer, Service ID, Tikor, Contact, Address
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
            <Table className="text-[10px] sm:text-xs min-w-[800px]">
              <TableHeader>
                <TableRow className="h-6 sm:h-8">
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap sticky top-0 bg-background">Provinsi</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap sticky top-0 bg-background">Customer</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap sticky top-0 bg-background">Service ID</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap sticky top-0 bg-background">Tikor</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap sticky top-0 bg-background">Contact</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap sticky top-0 bg-background">Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground px-1 sm:px-2 py-1">
                      Memuat data AKV...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground px-1 sm:px-2 py-1">
                      {akvData.length === 0
                        ? "Belum ada data AKV User. Import data melalui halaman Settings."
                        : "Tidak ada data yang sesuai dengan pencarian."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.slice(0, 100).map((akv) => (
                    <TableRow key={akv.id} className="h-6 sm:h-8">
                      <TableCell className="px-1 sm:px-2 py-0.5 sm:py-1">{akv.provinsi || "-"}</TableCell>
                      <TableCell className="px-1 sm:px-2 py-0.5 sm:py-1">{akv.customer || "-"}</TableCell>
                      <TableCell className="font-mono px-1 sm:px-2 py-0.5 sm:py-1">{akv.serviceId || "-"}</TableCell>
                      <TableCell className="font-mono px-1 sm:px-2 py-0.5 sm:py-1 max-w-[150px] truncate" title={akv.tikor}>
                        {akv.tikor || "-"}
                      </TableCell>
                      <TableCell className="px-1 sm:px-2 py-0.5 sm:py-1">{akv.contact || "-"}</TableCell>
                      <TableCell className="px-1 sm:px-2 py-0.5 sm:py-1 max-w-[200px] truncate" title={akv.address}>
                        {akv.address || "-"}
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
