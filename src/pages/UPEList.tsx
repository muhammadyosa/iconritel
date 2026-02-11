import { useState, useEffect } from "react";
import { Download, Server, FileText, Info, FileDown } from "lucide-react";
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
import { sanitizeForCSV } from "@/lib/validation";
import { openDB } from "@/lib/indexedDB";
import { Link } from "react-router-dom";

interface UPE {
  id: string;
  hostnameUPE: string;
  hostnameOLT: string;
  createdAt: string;
}

const UPE_STORE_NAME = "upe_data";

const UPE_FIELDS = [
  { value: "all", label: "Semua Field" },
  { value: "hostnameUPE", label: "Hostname UPE" },
  { value: "hostnameOLT", label: "Hostname OLT" },
];

async function loadUPEData(): Promise<UPE[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([UPE_STORE_NAME], "readonly");
      const store = transaction.objectStore(UPE_STORE_NAME);
      const request = store.get("upe_records");
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}


const UPEList = () => {
  const [upeData, setUpeData] = useState<UPE[]>([]);
  const [searchField, setSearchField] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUPEData()
      .then((data) => {
        setUpeData(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const buildExportData = () => {
    return filteredData.map((upe) => ({
      "Hostname UPE": sanitizeForCSV(upe.hostnameUPE),
      "Hostname OLT": sanitizeForCSV(upe.hostnameOLT),
      "Tanggal Import": sanitizeForCSV(new Date(upe.createdAt).toLocaleString("id-ID")),
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
    XLSX.utils.book_append_sheet(wb, ws, "List UPE");
    XLSX.writeFile(wb, `List_UPE_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Export berhasil", description: "Data UPE berhasil diekspor ke Excel." });
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
    a.download = `List_UPE_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export berhasil", description: "Data UPE berhasil diekspor ke CSV." });
  };


  const filteredData = upeData.filter((upe) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    if (searchField === "all") {
      return (
        String(upe.hostnameUPE || "").toLowerCase().includes(query) ||
        String(upe.hostnameOLT || "").toLowerCase().includes(query)
      );
    }
    
    const fieldValue = String(upe[searchField as keyof UPE] || "").toLowerCase();
    return fieldValue.includes(query);
  });

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">🔗 Data UPE</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Data UPE diimport melalui <Link to="/settings" className="text-primary underline hover:no-underline">Settings</Link>
        </p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <span className="text-sm sm:text-base">🔗 Data UPE</span>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-normal mt-0.5 sm:mt-1">
                  {isLoading ? (
                    "Memuat data UPE..."
                  ) : upeData.length > 0 ? (
                    `✓ ${upeData.length} data tersimpan dari Import Master Data`
                  ) : (
                    <span className="flex items-center gap-1 flex-wrap">
                      <Info className="h-3 w-3 flex-shrink-0" />
                      <span>Belum ada data. Import melalui{" "}
                      <Link to="/settings" className="text-primary underline hover:no-underline">
                        Settings
                      </Link></span>
                    </span>
                  )}
                </p>
              </div>
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
            Kolom: Hostname UPE, Hostname OLT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 md:space-y-4 p-2 sm:p-4 md:p-6">
          {/* Simplified Search & Filter */}
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 items-stretch xs:items-center">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="w-full xs:w-[140px] sm:w-[180px] h-7 sm:h-9 bg-background text-[10px] sm:text-sm">
                  <SelectValue placeholder="Pilih Field" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {UPE_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value} className="text-[10px] sm:text-sm">
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full sm:max-w-md">
              <Input
                placeholder={`Cari ${UPE_FIELDS.find(f => f.value === searchField)?.label || "data"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 sm:h-9 text-[10px] sm:text-sm"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto max-h-72 sm:max-h-96 -mx-2 sm:mx-0">
            <Table className="text-[10px] sm:text-xs min-w-[400px]">
              <TableHeader>
                <TableRow className="h-6 sm:h-8">
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap">Hostname UPE</TableHead>
                  <TableHead className="px-1 sm:px-2 py-1 whitespace-nowrap">Hostname OLT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground px-1 sm:px-2 py-1">
                      Memuat data UPE...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground px-1 sm:px-2 py-1">
                      {upeData.length === 0
                        ? "Belum ada data UPE. Silakan import file Excel/CSV."
                        : "Tidak ada data yang sesuai dengan pencarian."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.slice(0, 100).map((upe) => (
                    <TableRow key={upe.id} className="h-6 sm:h-8">
                      <TableCell className="font-mono px-1 sm:px-2 py-0.5 sm:py-1">{upe.hostnameUPE}</TableCell>
                      <TableCell className="font-mono px-1 sm:px-2 py-0.5 sm:py-1">{upe.hostnameOLT}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
            {filteredData.length > 100 ? (
              <span className="hidden sm:inline">Menampilkan 100 dari {filteredData.length} hasil pencarian (Total: {upeData.length} data UPE)</span>
            ) : (
              <span className="hidden sm:inline">Total: {filteredData.length} dari {upeData.length} data UPE</span>
            )}
            <span className="sm:hidden">
              {filteredData.length > 100 ? `100/${filteredData.length}` : `${filteredData.length}/${upeData.length}`} data
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UPEList;
