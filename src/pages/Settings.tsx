import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Info, FileSpreadsheet, FileUp, Check, X, AlertCircle, RefreshCw, Database, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { importMultiSheetExcel, getExcelSheets, ImportResult } from "@/lib/multiSheetImport";
import { saveExcelData, saveOLTData, saveFATData, openDB, clearAllData, saveFDTData, saveAKVData, loadExcelData, loadOLTData, loadFATData, loadFDTData, loadAKVData } from "@/lib/indexedDB";

const UPE_STORE_NAME = "upe_data";
const BNG_STORE_NAME = "bng_data";

// Save UPE data to IndexedDB
async function saveUPEData(data: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([UPE_STORE_NAME], "readwrite");
    const store = transaction.objectStore(UPE_STORE_NAME);
    const request = store.put(data, "upe_records");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Save BNG data to IndexedDB
async function saveBNGData(data: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BNG_STORE_NAME], "readwrite");
    const store = transaction.objectStore(BNG_STORE_NAME);
    const request = store.put(data, "bng_records");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

interface SheetPreview {
  name: string;
  rowCount: number;
  type: string | null;
}

interface DataCounts {
  user: number;
  olt: number;
  fat: number;
  upe: number;
  bng: number;
  fdt: number;
  akv: number;
}

interface ColumnStatus {
  user: { customer: boolean; service: boolean; hostname: boolean; fat: boolean; sn: boolean };
  fat: { provinsi: boolean; fatId: boolean; hostname: boolean; tikor: boolean };
  olt: { provinsi: boolean; idOlt: boolean; hostnameOlt: boolean; hostnameUpe: boolean; ipNmsOlt: boolean; tikorOlt: boolean };
  upe: { hostnameOLT: boolean; hostnameUPE: boolean };
  bng: { ipRadius: boolean; hostnameRadius: boolean; ipBng: boolean; hostnameBng: boolean; npe: boolean; vlan: boolean; hostnameOlt: boolean; upe: boolean; portUpe: boolean; kotaKabupaten: boolean };
  fdt: { provinsi: boolean; area: boolean; idFDT: boolean; tikor: boolean };
  akv: { provinsi: boolean; customer: boolean; serviceId: boolean; tikor: boolean; contact: boolean; address: boolean };
}

// Load UPE data from IndexedDB
async function loadUPEData(): Promise<any[]> {
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

// Load BNG data from IndexedDB
async function loadBNGData(): Promise<any[]> {
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

export default function Settings() {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [dataCounts, setDataCounts] = useState<DataCounts>({
    user: 0,
    olt: 0,
    fat: 0,
    upe: 0,
    bng: 0,
    fdt: 0,
    akv: 0,
  });
  const [columnStatus, setColumnStatus] = useState<ColumnStatus>({
    user: { customer: false, service: false, hostname: false, fat: false, sn: false },
    fat: { provinsi: false, fatId: false, hostname: false, tikor: false },
    olt: { provinsi: false, idOlt: false, hostnameOlt: false, hostnameUpe: false, ipNmsOlt: false, tikorOlt: false },
    upe: { hostnameOLT: false, hostnameUPE: false },
    bng: { ipRadius: false, hostnameRadius: false, ipBng: false, hostnameBng: false, npe: false, vlan: false, hostnameOlt: false, upe: false, portUpe: false, kotaKabupaten: false },
    fdt: { provinsi: false, area: false, idFDT: false, tikor: false },
    akv: { provinsi: false, customer: false, serviceId: false, tikor: false, contact: false, address: false },
  });

  // Load data counts and column status from IndexedDB on mount and after import/delete
  const loadDataCounts = async () => {
    try {
      const [userData, oltData, fatData, upeData, bngData, fdtData, akvData] = await Promise.all([
        loadExcelData(),
        loadOLTData(),
        loadFATData(),
        loadUPEData(),
        loadBNGData(),
        loadFDTData(),
        loadAKVData(),
      ]);
      setDataCounts({
        user: userData.length,
        olt: oltData.length,
        fat: fatData.length,
        upe: upeData.length,
        bng: bngData.length,
        fdt: fdtData.length,
        akv: akvData.length,
      });

      // Check column availability for each data type
      const checkColumnHasData = (data: any[], key: string): boolean => {
        return data.some((item) => item[key] && String(item[key]).trim() !== "");
      };

      setColumnStatus({
        user: {
          customer: checkColumnHasData(userData, "customer"),
          service: checkColumnHasData(userData, "service"),
          hostname: checkColumnHasData(userData, "hostname"),
          fat: checkColumnHasData(userData, "fat"),
          sn: checkColumnHasData(userData, "sn"),
        },
        fat: {
          provinsi: checkColumnHasData(fatData, "provinsi"),
          fatId: checkColumnHasData(fatData, "fatId"),
          hostname: checkColumnHasData(fatData, "hostname"),
          tikor: checkColumnHasData(fatData, "tikor"),
        },
        olt: {
          provinsi: checkColumnHasData(oltData, "provinsi"),
          idOlt: checkColumnHasData(oltData, "idOlt"),
          hostnameOlt: checkColumnHasData(oltData, "hostnameOlt"),
          hostnameUpe: checkColumnHasData(oltData, "hostnameUpe"),
          ipNmsOlt: checkColumnHasData(oltData, "ipNmsOlt"),
          tikorOlt: checkColumnHasData(oltData, "tikorOlt"),
        },
        upe: {
          hostnameOLT: checkColumnHasData(upeData, "hostnameOLT"),
          hostnameUPE: checkColumnHasData(upeData, "hostnameUPE"),
        },
        bng: {
          ipRadius: checkColumnHasData(bngData, "ipRadius"),
          hostnameRadius: checkColumnHasData(bngData, "hostnameRadius"),
          ipBng: checkColumnHasData(bngData, "ipBng"),
          hostnameBng: checkColumnHasData(bngData, "hostnameBng"),
          npe: checkColumnHasData(bngData, "npe"),
          vlan: checkColumnHasData(bngData, "vlan"),
          hostnameOlt: checkColumnHasData(bngData, "hostnameOlt"),
          upe: checkColumnHasData(bngData, "upe"),
          portUpe: checkColumnHasData(bngData, "portUpe"),
          kotaKabupaten: checkColumnHasData(bngData, "kotaKabupaten"),
        },
        fdt: {
          provinsi: checkColumnHasData(fdtData, "provinsi"),
          area: checkColumnHasData(fdtData, "area"),
          idFDT: checkColumnHasData(fdtData, "idFDT"),
          tikor: checkColumnHasData(fdtData, "tikor"),
        },
        akv: {
          provinsi: checkColumnHasData(akvData, "provinsi"),
          customer: checkColumnHasData(akvData, "customer"),
          serviceId: checkColumnHasData(akvData, "serviceId"),
          tikor: checkColumnHasData(akvData, "tikor"),
          contact: checkColumnHasData(akvData, "contact"),
          address: checkColumnHasData(akvData, "address"),
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error loading data counts:", error);
      }
    }
  };

  useEffect(() => {
    loadDataCounts();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setSheets([]);
    setImportResult(null);
    setIsAnalyzing(true);

    try {
      const sheetList = await getExcelSheets(selectedFile);
      setSheets(sheetList);
      toast.success(`File berhasil dianalisis: ${sheetList.length} sheet ditemukan`);
    } catch (error) {
      toast.error("Gagal menganalisis file Excel");
      if (import.meta.env.DEV) {
        console.error("Error analyzing Excel:", error);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setShowConfirmDialog(false);
    setIsImporting(true);
    setImportProgress(0);

    try {
      setImportProgress(10);
      const result = await importMultiSheetExcel(file);
      setImportProgress(30);

      if (result.userRecords.length > 0) {
        await saveExcelData(result.userRecords);
        setImportProgress(50);
      }

      if (result.oltRecords.length > 0) {
        await saveOLTData(result.oltRecords);
        setImportProgress(55);
      }

      if (result.fatRecords.length > 0) {
        await saveFATData(result.fatRecords);
        setImportProgress(65);
      }

      if (result.upeRecords.length > 0) {
        await saveUPEData(result.upeRecords);
        setImportProgress(80);
      }

      if (result.bngRecords.length > 0) {
        await saveBNGData(result.bngRecords);
        setImportProgress(90);
      }

      if (result.fdtRecords.length > 0) {
        await saveFDTData(result.fdtRecords);
        setImportProgress(92);
      }

      if (result.akvRecords.length > 0) {
        await saveAKVData(result.akvRecords);
        setImportProgress(97);
      }

      setImportProgress(100);
      setImportResult(result);

      // Refresh data counts after import
      await loadDataCounts();

      const totalRecords = result.summary.user + result.summary.olt + result.summary.fat + result.summary.upe + result.summary.bng + result.summary.fdt + result.summary.akv;
      toast.success(`Berhasil import ${totalRecords.toLocaleString()} data dari ${result.summary.processedSheets.length} sheet`);
    } catch (error) {
      toast.error("Gagal mengimport data");
      if (import.meta.env.DEV) {
        console.error("Error importing Excel:", error);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case "user":
        return { label: "📋 List User", color: "bg-blue-500" };
      case "olt":
        return { label: "📟 List OLT", color: "bg-cyan-500" };
      case "fat":
        return { label: "📍 List FAT", color: "bg-green-500" };
      case "upe":
        return { label: "🔗 List UPE", color: "bg-purple-500" };
      case "bng":
        return { label: "🛰 List BNG", color: "bg-orange-500" };
      case "fdt":
        return { label: "📦 List FDT", color: "bg-amber-500" };
      case "akv":
        return { label: "🗂️ List AKV User", color: "bg-pink-500" };
      default:
        return { label: "Tidak Dikenali", color: "bg-muted" };
    }
  };

  const resetImport = () => {
    setFile(null);
    setSheets([]);
    setImportResult(null);
    setImportProgress(0);
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await clearAllData();
      toast.success("Semua data berhasil dihapus");
      setShowDeleteAllDialog(false);
      resetImport();
      // Refresh data counts after delete
      await loadDataCounts();
    } catch (error) {
      toast.error("Gagal menghapus data");
      if (import.meta.env.DEV) {
        console.error("Error deleting all data:", error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const recognizedSheets = sheets.filter(s => s.type !== null);
  const unrecognizedSheets = sheets.filter(s => s.type === null);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">🛠 Settings</h1>
          <p className="text-muted-foreground text-sm">
            Konfigurasi aplikasi dan import data
          </p>
        </div>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import Master Data
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Informasi
          </TabsTrigger>
        </TabsList>

        {/* Import Master Data Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* File Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload File Excel
              </CardTitle>
              <CardDescription>
                Pilih file Excel (.xlsx, .xls) - data tersimpan permanen di aplikasi (hanya perlu upload 1x)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="excel-upload"
                    disabled={isImporting}
                  />
                  <label htmlFor="excel-upload">
                    <Button variant="outline" asChild disabled={isImporting || isAnalyzing}>
                      <span className="cursor-pointer">
                        <FileUp className="h-4 w-4 mr-2" />
                        {isAnalyzing ? "Menganalisis..." : "Pilih File Excel"}
                      </span>
                    </Button>
                  </label>
                  {file && (
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetImport}
                        disabled={isImporting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Mengimport data...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}

                {/* Delete All Data Button */}
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteAllDialog(true)}
                    disabled={isImporting || isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus Semua Data
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Menghapus semua data: Ticket Management, List FAT, List UPE, List BNG, dan Report
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sheet Analysis Card */}
          {sheets.length > 0 && !importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Analisis Sheet ({sheets.length} sheet ditemukan)
                </CardTitle>
                <CardDescription>
                  Sistem akan mendeteksi jenis data berdasarkan nama sheet dan kolom
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recognizedSheets.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Sheet yang Dikenali ({recognizedSheets.length})
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Sheet</TableHead>
                          <TableHead>Jumlah Baris</TableHead>
                          <TableHead>Tipe Data</TableHead>
                          <TableHead>Target</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recognizedSheets.map((sheet) => {
                          const typeInfo = getTypeLabel(sheet.type);
                          return (
                            <TableRow key={sheet.name}>
                              <TableCell className="font-medium">{sheet.name}</TableCell>
                              <TableCell>{sheet.rowCount.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {sheet.type === "user" && "→ Ticket Management"}
                                {sheet.type === "olt" && "→ List OLT"}
                                {sheet.type === "fat" && "→ List FAT"}
                                {sheet.type === "upe" && "→ List UPE"}
                                {sheet.type === "bng" && "→ List BNG"}
                                {sheet.type === "fdt" && "→ List FDT"}
                                {sheet.type === "akv" && "→ List AKV User"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {unrecognizedSheets.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      Sheet tidak dikenali ({unrecognizedSheets.length}) - akan dilewati
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {unrecognizedSheets.map((sheet) => (
                        <Badge key={sheet.name} variant="outline">
                          {sheet.name} ({sheet.rowCount} baris)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={recognizedSheets.length === 0 || isImporting}
                    size="lg"
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Import {recognizedSheets.length} Sheet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Result Card */}
          {importResult && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  Import Berhasil!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResult.summary.user.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">List User → Ticket</div>
                  </div>
                  <div className="bg-cyan-50 dark:bg-cyan-950 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-cyan-600">{importResult.summary.olt.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">List OLT → Data OLT</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.summary.fat.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">List FAT → Data FAT</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{importResult.summary.upe.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">List UPE → Data UPE</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{importResult.summary.bng.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">List BNG → Data BNG</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-600">{importResult.summary.fdt.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">List FDT → Data FDT</div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✓ Data tersimpan permanen! Anda dapat langsung menggunakan:
                  </p>
                  <ul className="mt-2 text-sm text-green-700 dark:text-green-300 space-y-1">
                    {importResult.summary.user > 0 && <li>• Ticket Management - {importResult.summary.user.toLocaleString()} data user siap digunakan</li>}
                    {importResult.summary.olt > 0 && <li>• List OLT - {importResult.summary.olt.toLocaleString()} data OLT siap digunakan</li>}
                    {importResult.summary.fat > 0 && <li>• List FAT - {importResult.summary.fat.toLocaleString()} data FAT siap digunakan</li>}
                    {importResult.summary.upe > 0 && <li>• List UPE - {importResult.summary.upe.toLocaleString()} data UPE siap digunakan</li>}
                    {importResult.summary.bng > 0 && <li>• List BNG - {importResult.summary.bng.toLocaleString()} data BNG siap digunakan</li>}
                    {importResult.summary.fdt > 0 && <li>• List FDT - {importResult.summary.fdt.toLocaleString()} data FDT siap digunakan</li>}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Sheet yang Diproses:</h4>
                  <div className="flex flex-wrap gap-2">
                    {importResult.summary.processedSheets.map((sheet) => (
                      <Badge key={sheet} variant="secondary" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        {sheet}
                      </Badge>
                    ))}
                  </div>
                </div>

                {importResult.summary.skippedSheets.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Sheet yang Dilewati:</h4>
                    <div className="flex flex-wrap gap-2">
                      {importResult.summary.skippedSheets.map((sheet) => (
                        <Badge key={sheet} variant="outline">
                          {sheet}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-2">
                  <Button variant="outline" onClick={resetImport}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Import File Lain
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle>Format File yang Didukung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {dataCounts.user > 0 ? "♻️" : "⚠️"} 📋 List User
                    </h4>
                    <Badge variant={dataCounts.user > 0 ? "default" : "secondary"} className={dataCounts.user > 0 ? "bg-blue-500" : ""}>
                      {dataCounts.user.toLocaleString()} data
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Kolom yang didukung:</p>
                  <ul className="text-xs text-muted-foreground list-none space-y-0.5">
                    <li>{columnStatus.user.customer ? "✅" : "⛔"} Customer Name / customer / nama pelanggan</li>
                    <li>{columnStatus.user.service ? "✅" : "⛔"} Service ID / service</li>
                    <li>{columnStatus.user.hostname ? "✅" : "⛔"} Hostname OLT / hostname</li>
                    <li>{columnStatus.user.fat ? "✅" : "⛔"} ID FAT / fat</li>
                    <li>{columnStatus.user.sn ? "✅" : "⛔"} SN ONT / sn</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {dataCounts.fat > 0 ? "♻️" : "⚠️"} 📍 List FAT
                    </h4>
                    <Badge variant={dataCounts.fat > 0 ? "default" : "secondary"} className={dataCounts.fat > 0 ? "bg-green-500" : ""}>
                      {dataCounts.fat.toLocaleString()} data
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Kolom yang didukung:</p>
                  <ul className="text-xs text-muted-foreground list-none space-y-0.5">
                    <li>{columnStatus.fat.provinsi ? "✅" : "⛔"} Provinsi</li>
                    <li>{columnStatus.fat.fatId ? "✅" : "⛔"} ID FAT / FAT ID</li>
                    <li>{columnStatus.fat.hostname ? "✅" : "⛔"} Hostname OLT</li>
                    <li>{columnStatus.fat.tikor ? "✅" : "⛔"} Tikor FAT / koordinat</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {dataCounts.olt > 0 ? "♻️" : "⚠️"} 📟 List OLT
                    </h4>
                    <Badge variant={dataCounts.olt > 0 ? "default" : "secondary"} className={dataCounts.olt > 0 ? "bg-cyan-500" : ""}>
                      {dataCounts.olt.toLocaleString()} data
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Kolom yang didukung:</p>
                  <ul className="text-xs text-muted-foreground list-none space-y-0.5">
                    <li>{columnStatus.olt.provinsi ? "✅" : "⛔"} PROVINSI</li>
                    <li>{columnStatus.olt.idOlt ? "✅" : "⛔"} ID OLT</li>
                    <li>{columnStatus.olt.hostnameOlt ? "✅" : "⛔"} HOSTNAME OLT</li>
                    <li>{columnStatus.olt.hostnameUpe ? "✅" : "⛔"} HOSTNAME UPE</li>
                    <li>{columnStatus.olt.ipNmsOlt ? "✅" : "⛔"} IP NMS OLT</li>
                    <li>{columnStatus.olt.tikorOlt ? "✅" : "⛔"} TIKOR OLT</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {dataCounts.upe > 0 ? "♻️" : "⚠️"} 🔗 List UPE
                    </h4>
                    <Badge variant={dataCounts.upe > 0 ? "default" : "secondary"} className={dataCounts.upe > 0 ? "bg-purple-500" : ""}>
                      {dataCounts.upe.toLocaleString()} data
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Kolom yang didukung:</p>
                  <ul className="text-xs text-muted-foreground list-none space-y-0.5">
                    <li>{columnStatus.upe.hostnameOLT ? "✅" : "⛔"} Hostname OLT</li>
                    <li>{columnStatus.upe.hostnameUPE ? "✅" : "⛔"} Hostname UPE</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {dataCounts.bng > 0 ? "♻️" : "⚠️"} 🛰 List BNG
                    </h4>
                    <Badge variant={dataCounts.bng > 0 ? "default" : "secondary"} className={dataCounts.bng > 0 ? "bg-orange-500" : ""}>
                      {dataCounts.bng.toLocaleString()} data
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Kolom yang didukung:</p>
                  <ul className="text-xs text-muted-foreground list-none space-y-0.5">
                    <li>{columnStatus.bng.ipRadius ? "✅" : "⛔"} IP RADIUS</li>
                    <li>{columnStatus.bng.hostnameRadius ? "✅" : "⛔"} HOSTNAME RADIUS</li>
                    <li>{columnStatus.bng.ipBng ? "✅" : "⛔"} IP BNG</li>
                    <li>{columnStatus.bng.hostnameBng ? "✅" : "⛔"} HOSTNAME BNG</li>
                    <li>{columnStatus.bng.npe ? "✅" : "⛔"} NPE</li>
                    <li>{columnStatus.bng.vlan ? "✅" : "⛔"} VLAN</li>
                    <li>{columnStatus.bng.hostnameOlt ? "✅" : "⛔"} HOSTNAME OLT</li>
                    <li>{columnStatus.bng.upe ? "✅" : "⛔"} UPE</li>
                    <li>{columnStatus.bng.portUpe ? "✅" : "⛔"} PORT UPE</li>
                    <li>{columnStatus.bng.kotaKabupaten ? "✅" : "⛔"} KOTA/KABUPATEN</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {dataCounts.fdt > 0 ? "♻️" : "⚠️"} 📦 List FDT
                    </h4>
                    <Badge variant={dataCounts.fdt > 0 ? "default" : "secondary"} className={dataCounts.fdt > 0 ? "bg-amber-500" : ""}>
                      {dataCounts.fdt.toLocaleString()} data
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Kolom yang didukung:</p>
                  <ul className="text-xs text-muted-foreground list-none space-y-0.5">
                    <li>{columnStatus.fdt.provinsi ? "✅" : "⛔"} NAMA PROVINSI</li>
                    <li>{columnStatus.fdt.area ? "✅" : "⛔"} NAMA AREA</li>
                    <li>{columnStatus.fdt.idFDT ? "✅" : "⛔"} ID FDT</li>
                    <li>{columnStatus.fdt.tikor ? "✅" : "⛔"} TIKOR</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {dataCounts.akv > 0 ? "♻️" : "⚠️"} 🗂️ List AKV User
                    </h4>
                    <Badge variant={dataCounts.akv > 0 ? "default" : "secondary"} className={dataCounts.akv > 0 ? "bg-pink-500" : ""}>
                      {dataCounts.akv.toLocaleString()} data
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Kolom yang didukung:</p>
                  <ul className="text-xs text-muted-foreground list-none space-y-0.5">
                    <li>{columnStatus.akv.provinsi ? "✅" : "⛔"} Provinsi</li>
                    <li>{columnStatus.akv.customer ? "✅" : "⛔"} Customer</li>
                    <li>{columnStatus.akv.serviceId ? "✅" : "⛔"} Service ID</li>
                    <li>{columnStatus.akv.tikor ? "✅" : "⛔"} Tikor</li>
                    <li>{columnStatus.akv.contact ? "✅" : "⛔"} Contact</li>
                    <li>{columnStatus.akv.address ? "✅" : "⛔"} Address</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          {/* Note Section */}
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Semoga aplikasi sederhana ini bisa bermanfaat dalam proses pekerjaan di Iconnet, mohon maaf apabila masih ada kekurangan di dalam aplikasi ini.
                </p>
                <p>
                  Aplikasi ini belum mencapai versi final, yang artinya kalian dapat memberikan saran dan masukan agar kelak aplikasi ini dapat dikembangkan lagi untuk kedepannya.
                </p>
              </div>
              <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-muted-foreground bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-r-lg">
                <p className="leading-relaxed">"Когда вдруг на душе становится тяжело, но не с кем поговорить, поэтому просто сидишь в тишине. Но когда всё хорошо спланировано, спешить некуда."</p>
                <p className="mt-3 not-italic font-semibold text-primary text-xs tracking-wider uppercase flex items-center gap-2">
                  <span className="inline-block w-8 h-px bg-primary/50"></span>
                  The man burdened with glorious purpose
                  <span className="inline-block w-8 h-px bg-primary/50"></span>
                </p>
              </blockquote>
              <div className="pt-2 text-center space-y-1">
                <p className="text-sm font-medium">© RZ Corp. All Rights Reserved</p>
                <p className="text-sm font-medium">By Muhammadyoss</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Import Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Import</DialogTitle>
            <DialogDescription>
              Data yang sudah ada akan diganti dengan data baru. Apakah Anda yakin ingin melanjutkan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleImport}>
              Ya, Import Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete All Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Hapus Semua Data
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Apakah Anda yakin ingin menghapus semua data? Tindakan ini akan menghapus:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>📋 Data Ticket Management (List User)</li>
                <li>📍 Data List FAT</li>
                <li>📟 Data List OLT</li>
                <li>🔗 Data List UPE</li>
                <li>🌐 Data List BNG</li>
                <li>📦 Data List FDT</li>
                <li>🗂️ Data List AKV User</li>
                <li>📝 Data Report (Shift Report & Ticket Updates)</li>
              </ul>
              <p className="font-medium text-destructive">Tindakan ini tidak dapat dibatalkan!</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllData} disabled={isDeleting}>
              {isDeleting ? "Menghapus..." : "Ya, Hapus Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}