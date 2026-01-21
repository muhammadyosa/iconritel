import { useState, useEffect } from "react";
import { Download, Network, FileText, Info } from "lucide-react";
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
import { sanitizeForCSV } from "@/lib/validation";
import { openDB } from "@/lib/indexedDB";
import { Link } from "react-router-dom";

interface BNG {
  id: string;
  ipRadius: string;
  hostnameRadius: string;
  ipBng: string;
  hostnameBng: string;
  npe: string;
  vlan: string;
  hostnameOlt: string;
  upe: string;
  portUpe: string;
  kotaKabupaten: string;
  createdAt: string;
}

const BNG_STORE_NAME = "bng_data";

const BNG_FIELDS = [
  { value: "all", label: "Semua Field" },
  { value: "ipRadius", label: "IP RADIUS" },
  { value: "hostnameRadius", label: "HOSTNAME RADIUS" },
  { value: "ipBng", label: "IP BNG" },
  { value: "hostnameBng", label: "HOSTNAME BNG" },
  { value: "npe", label: "NPE" },
  { value: "vlan", label: "VLAN" },
  { value: "hostnameOlt", label: "HOSTNAME OLT" },
  { value: "upe", label: "UPE" },
  { value: "portUpe", label: "PORT UPE" },
  { value: "kotaKabupaten", label: "KOTA/KABUPATEN" },
];

async function loadBNGData(): Promise<BNG[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BNG_STORE_NAME], "readonly");
      const store = transaction.objectStore(BNG_STORE_NAME);
      const request = store.get("bng_records");
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}


const BNGList = () => {
  const [bngData, setBngData] = useState<BNG[]>([]);
  const [searchField, setSearchField] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBNGData()
      .then((data) => {
        setBngData(data);
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

    const exportData = filteredData.map((bng) => ({
      "IP RADIUS": sanitizeForCSV(bng.ipRadius),
      "HOSTNAME RADIUS": sanitizeForCSV(bng.hostnameRadius),
      "IP BNG": sanitizeForCSV(bng.ipBng),
      "HOSTNAME BNG": sanitizeForCSV(bng.hostnameBng),
      "NPE": sanitizeForCSV(bng.npe),
      "VLAN": sanitizeForCSV(bng.vlan),
      "HOSTNAME OLT": sanitizeForCSV(bng.hostnameOlt),
      "UPE": sanitizeForCSV(bng.upe),
      "PORT UPE": sanitizeForCSV(bng.portUpe),
      "KOTA/KABUPATEN": sanitizeForCSV(bng.kotaKabupaten),
      "Tanggal Import": sanitizeForCSV(new Date(bng.createdAt).toLocaleString("id-ID")),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "List BNG");
    XLSX.writeFile(wb, `List_BNG_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Export berhasil",
      description: "Data BNG berhasil diekspor ke Excel.",
    });
  };


  const filteredData = bngData.filter((bng) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    if (searchField === "all") {
      return (
        String(bng.ipRadius || "").toLowerCase().includes(query) ||
        String(bng.hostnameRadius || "").toLowerCase().includes(query) ||
        String(bng.ipBng || "").toLowerCase().includes(query) ||
        String(bng.hostnameBng || "").toLowerCase().includes(query) ||
        String(bng.npe || "").toLowerCase().includes(query) ||
        String(bng.vlan || "").toLowerCase().includes(query) ||
        String(bng.hostnameOlt || "").toLowerCase().includes(query) ||
        String(bng.upe || "").toLowerCase().includes(query) ||
        String(bng.portUpe || "").toLowerCase().includes(query) ||
        String(bng.kotaKabupaten || "").toLowerCase().includes(query)
      );
    }
    
    const fieldValue = String(bng[searchField as keyof BNG] || "").toLowerCase();
    return fieldValue.includes(query);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🛰 List BNG</h1>
        <p className="text-muted-foreground">
          Data BNG diimport melalui <Link to="/import" className="text-primary underline hover:no-underline">Import Master Data</Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              <div>
                <span>Data BNG</span>
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  {isLoading ? (
                    "Memuat data BNG..."
                  ) : bngData.length > 0 ? (
                    `✓ ${bngData.length} data tersimpan dari Import Master Data`
                  ) : (
                    <span className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Belum ada data. Import melalui{" "}
                      <Link to="/import" className="text-primary underline hover:no-underline">
                        Import Master Data
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
            Kolom: IP RADIUS, HOSTNAME RADIUS, IP BNG, HOSTNAME BNG, NPE, VLAN, HOSTNAME OLT, UPE, PORT UPE, KOTA/KABUPATEN
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
                  {BNG_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full sm:max-w-md">
              <Input
                placeholder={`Cari ${BNG_FIELDS.find(f => f.value === searchField)?.label || "data"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto max-h-96">
            <Table className="text-[10px] min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-1 py-1 whitespace-nowrap">IP RADIUS</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">HOST RADIUS</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">IP BNG</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">HOST BNG</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">NPE</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">VLAN</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">HOST OLT</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">UPE</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">PORT UPE</TableHead>
                  <TableHead className="px-1 py-1 whitespace-nowrap">KOTA/KAB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground px-1 py-1">
                      Memuat data BNG...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground px-1 py-1">
                      {bngData.length === 0
                        ? "Belum ada data BNG. Silakan import file Excel/CSV."
                        : "Tidak ada data yang sesuai dengan pencarian."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.slice(0, 100).map((bng) => (
                    <TableRow key={bng.id}>
                      <TableCell className="font-mono px-1 py-0.5">{bng.ipRadius}</TableCell>
                      <TableCell className="font-mono px-1 py-0.5">{bng.hostnameRadius}</TableCell>
                      <TableCell className="font-mono px-1 py-0.5">{bng.ipBng}</TableCell>
                      <TableCell className="font-mono px-1 py-0.5">{bng.hostnameBng}</TableCell>
                      <TableCell className="font-mono px-1 py-0.5">{bng.npe}</TableCell>
                      <TableCell className="font-mono px-1 py-0.5">{bng.vlan}</TableCell>
                      <TableCell className="font-mono px-1 py-0.5">{bng.hostnameOlt}</TableCell>
                      <TableCell className="font-mono px-1 py-0.5">{bng.upe}</TableCell>
                      <TableCell className="font-mono px-1 py-0.5">{bng.portUpe}</TableCell>
                      <TableCell className="px-1 py-0.5">{bng.kotaKabupaten}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredData.length > 100 ? (
              <>Menampilkan 100 dari {filteredData.length} hasil pencarian (Total: {bngData.length} data BNG)</>
            ) : (
              <>Total: {filteredData.length} dari {bngData.length} data BNG</>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BNGList;
