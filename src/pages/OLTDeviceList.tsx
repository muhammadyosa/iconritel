import { useState, useEffect } from "react";
import { Download, Server, FileText, Info } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { loadOLTData } from "@/lib/indexedDB";
import { sanitizeForCSV } from "@/lib/validation";
import { Link } from "react-router-dom";
import { OLT } from "@/types/olt";

const OLT_FIELDS = [
  { value: "all", label: "Semua Field" },
  { value: "provinsi", label: "PROVINSI" },
  { value: "idOlt", label: "ID OLT" },
  { value: "hostnameOlt", label: "HOSTNAME OLT" },
  { value: "hostnameUpe", label: "HOSTNAME UPE" },
  { value: "ipNmsOlt", label: "IP NMS OLT" },
  { value: "tikorOlt", label: "TIKOR OLT" },
];

const OLTDeviceList = () => {
  const [oltData, setOltData] = useState<OLT[]>([]);
  const [searchField, setSearchField] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOLTData()
      .then((data) => {
        setOltData(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
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

    const exportData = filteredData.map((olt) => ({
      "PROVINSI": sanitizeForCSV(olt.provinsi),
      "ID OLT": sanitizeForCSV(olt.idOlt),
      "HOSTNAME OLT": sanitizeForCSV(olt.hostnameOlt),
      "HOSTNAME UPE": sanitizeForCSV(olt.hostnameUpe),
      "IP NMS OLT": sanitizeForCSV(olt.ipNmsOlt),
      "TIKOR OLT": sanitizeForCSV(olt.tikorOlt),
      "Tanggal Import": sanitizeForCSV(new Date(olt.createdAt).toLocaleString("id-ID")),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "List OLT");
    XLSX.writeFile(wb, `List_OLT_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Export berhasil",
      description: "Data OLT berhasil diekspor ke Excel.",
    });
  };

  const filteredData = oltData.filter((olt) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    if (searchField === "all") {
      return (
        String(olt.provinsi || "").toLowerCase().includes(query) ||
        String(olt.idOlt || "").toLowerCase().includes(query) ||
        String(olt.hostnameOlt || "").toLowerCase().includes(query) ||
        String(olt.hostnameUpe || "").toLowerCase().includes(query) ||
        String(olt.ipNmsOlt || "").toLowerCase().includes(query) ||
        String(olt.tikorOlt || "").toLowerCase().includes(query)
      );
    }
    
    const fieldValue = String(olt[searchField as keyof OLT] || "").toLowerCase();
    return fieldValue.includes(query);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📟 List OLT</h1>
        <p className="text-muted-foreground">
          Data OLT diimport melalui{" "}
          <Link to="/settings" className="text-primary underline hover:no-underline">
            Settings
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <div>
                <span>Data OLT</span>
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  {isLoading ? (
                    "Memuat data OLT..."
                  ) : oltData.length > 0 ? (
                    `✓ ${oltData.length} data tersimpan dari Import Master Data`
                  ) : (
                    <span className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Belum ada data. Import melalui{" "}
                      <Link to="/settings" className="text-primary underline hover:no-underline">
                        Settings
                      </Link>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredData.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </CardTitle>
          <CardDescription>
            Kolom: PROVINSI, ID OLT, HOSTNAME OLT, HOSTNAME UPE, IP NMS OLT, TIKOR OLT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simplified Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="w-[180px] h-9 bg-background">
                  <SelectValue placeholder="Pilih Field" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {OLT_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full sm:max-w-md">
              <Input
                placeholder={`Cari ${OLT_FIELDS.find(f => f.value === searchField)?.label || "data"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto max-h-96">
            <Table className="text-xs min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-1.5 whitespace-nowrap">PROVINSI</TableHead>
                  <TableHead className="px-2 py-1.5 whitespace-nowrap">ID OLT</TableHead>
                  <TableHead className="px-2 py-1.5 whitespace-nowrap">HOSTNAME OLT</TableHead>
                  <TableHead className="px-2 py-1.5 whitespace-nowrap">HOSTNAME UPE</TableHead>
                  <TableHead className="px-2 py-1.5 whitespace-nowrap">IP NMS</TableHead>
                  <TableHead className="px-2 py-1.5 whitespace-nowrap">TIKOR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground px-2 py-1.5">
                      Memuat data OLT...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground px-2 py-1.5">
                      {oltData.length === 0
                        ? "Belum ada data OLT. Silakan import file Excel/CSV."
                        : "Tidak ada data yang sesuai dengan pencarian."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.slice(0, 100).map((olt) => (
                    <TableRow key={olt.id}>
                      <TableCell className="px-2 py-1.5">{olt.provinsi}</TableCell>
                      <TableCell className="font-mono px-2 py-1.5">{olt.idOlt}</TableCell>
                      <TableCell className="font-mono px-2 py-1.5">{olt.hostnameOlt}</TableCell>
                      <TableCell className="font-mono px-2 py-1.5">{olt.hostnameUpe}</TableCell>
                      <TableCell className="font-mono px-2 py-1.5">{olt.ipNmsOlt}</TableCell>
                      <TableCell className="font-mono px-2 py-1.5">{olt.tikorOlt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredData.length > 100 ? (
              <>Menampilkan 100 dari {filteredData.length} hasil pencarian (Total: {oltData.length} data OLT)</>
            ) : (
              <>Total: {filteredData.length} dari {oltData.length} data OLT</>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OLTDeviceList;
