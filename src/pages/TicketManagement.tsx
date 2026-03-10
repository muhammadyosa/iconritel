import { useState } from "react";
import { Download, Plus, Search, Trash2, Edit, Info, FileEdit, RefreshCw, Loader2, FileDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTickets } from "@/hooks/useTickets";
import { useCloudTickets } from "@/hooks/useCloudTickets";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import {
  Ticket,
  ALL_CONSTRAINTS,
  FEEDER_CONSTRAINTS_SET,
  generateTicketFormat,
  ExcelRecord,
} from "@/types/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketDetailDialog } from "@/components/TicketDetailDialog";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";

import { Link } from "react-router-dom";

export default function TicketManagement() {
  // Local Excel data from IndexedDB
  const { excelData, isLoadingExcel } = useTickets();
  
  // Cloud tickets from Supabase (shared across all users)
  const { 
    tickets, 
    isLoading: isLoadingTickets, 
    addTicket, 
    updateTicket, 
    deleteTicket,
    refetch: refetchTickets 
  } = useCloudTickets();

  // User role for permission-based UI
  const { isAdmin, isReviewer } = useUserRole();
  
  // Get current user for tracking who created tickets
  const { user, profile } = useAuth();
  const { logActivity } = useActivityLog();

  const [searchFilters, setSearchFilters] = useState({
    customer: "",
    service: "",
    hostname: "",
    fat: "",
    sn: "",
  });

  // Filter untuk Daftar Tiket - single search with field selector
  const [ticketSearchField, setTicketSearchField] = useState<string>("all");
  const [ticketSearchQuery, setTicketSearchQuery] = useState("");

  const [selectedRecord, setSelectedRecord] = useState<ExcelRecord | null>(null);
  const [formData, setFormData] = useState({
    ticketId: "",
    serpo: "",
    constraint: "",
    portText: "", // For PORT DOWN constraint
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    ticketId: "",
    serviceId: "",
    customerName: "",
    serpo: "",
    hostname: "",
    fatId: "",
    snOnt: "",
    constraint: "",
    portText: "",
  });

  const filteredData = excelData.filter((r) => {
    // Convert all fields to string to handle numeric values from Excel
    const customer = String(r.customer || "").toLowerCase();
    const service = String(r.service || "").toLowerCase();
    const hostname = String(r.hostname || "").toLowerCase();
    const fat = String(r.fat || "").toLowerCase();
    const sn = String(r.sn || "").toLowerCase();

    return (
      (!searchFilters.customer || customer.includes(searchFilters.customer.toLowerCase())) &&
      (!searchFilters.service || service.includes(searchFilters.service.toLowerCase())) &&
      (!searchFilters.hostname || hostname.includes(searchFilters.hostname.toLowerCase())) &&
      (!searchFilters.fat || fat.includes(searchFilters.fat.toLowerCase())) &&
      (!searchFilters.sn || sn.includes(searchFilters.sn.toLowerCase()))
    );
  });

  // Filter untuk Daftar Tiket
  const filteredTickets = tickets.filter((ticket) => {
    if (!ticketSearchQuery.trim()) return true;
    
    const query = ticketSearchQuery.toLowerCase();
    
    const getCustomerType = (t: Ticket) => {
      if (t.category === "FEEDER") {
        if (t.constraint === "OLT DOWN") return t.hostname;
        if (t.constraint === "PORT DOWN") return t.ticketResult.match(/PORT - (.*?) - DOWN/)?.[1] || t.hostname;
        if (t.constraint === "FAT LOSS" || t.constraint === "FAT LOW RX") return `${t.fatId} ${t.hostname}`;
        return t.constraint;
      }
      return t.customerName;
    };

    if (ticketSearchField === "all") {
      return (
        ticket.id.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query) ||
        getCustomerType(ticket).toLowerCase().includes(query) ||
        ticket.serviceId.toLowerCase().includes(query) ||
        ticket.constraint.toLowerCase().includes(query) ||
        ticket.serpo.toLowerCase().includes(query) ||
        ticket.status.toLowerCase().includes(query) ||
        ticket.createdAt.toLowerCase().includes(query) ||
        (ticket.createdByName || "").toLowerCase().includes(query)
      );
    }

    switch (ticketSearchField) {
      case "ticketId": return ticket.id.toLowerCase().includes(query);
      case "category": return ticket.category.toLowerCase().includes(query);
      case "customerType": return getCustomerType(ticket).toLowerCase().includes(query);
      case "serviceId": return ticket.serviceId.toLowerCase().includes(query);
      case "constraint": return ticket.constraint.toLowerCase().includes(query);
      case "serpo": return ticket.serpo.toLowerCase().includes(query);
      case "status": return ticket.status.toLowerCase().includes(query);
      case "created": return ticket.createdAt.toLowerCase().includes(query);
      case "createdBy": return (ticket.createdByName || "").toLowerCase().includes(query);
      default: return true;
    }
  });

  const handleSubmitTicket = async () => {
    if (!formData.ticketId.trim()) {
      toast.error("Ticket ID wajib diisi");
      return;
    }
    if (!formData.constraint) {
      toast.error("Constraint wajib dipilih");
      return;
    }
    if (!selectedRecord) {
      toast.error("Pilih record pada Preview Data");
      return;
    }
    if (!formData.serpo.trim()) {
      toast.error("Serpo/Tim wajib diisi");
      return;
    }

    const now = new Date();
    
    // Determine category based on constraint
    const category = FEEDER_CONSTRAINTS_SET.has(formData.constraint) ? "FEEDER" : "RITEL";
    
    // Auto-generate ticket format
    const ticketResult = generateTicketFormat(
      formData.constraint,
      String(selectedRecord.customer || ""),
      formData.serpo.trim(),
      String(selectedRecord.fat || ""),
      String(selectedRecord.hostname || ""),
      String(selectedRecord.sn || ""),
      formData.portText || undefined
    );
    
    const ticket: Ticket = {
      id: formData.ticketId.trim(),
      serviceId: String(selectedRecord.service || ""),
      customerName: String(selectedRecord.customer || ""),
      serpo: formData.serpo.trim(),
      hostname: String(selectedRecord.hostname || ""),
      fatId: String(selectedRecord.fat || ""),
      snOnt: String(selectedRecord.sn || ""),
      constraint: formData.constraint,
      category,
      ticketResult,
      status: "On Progress",
      createdAt: now.toLocaleString("id-ID"),
      createdISO: now.toISOString(),
      createdByUserId: user?.id,
      createdByName: profile?.display_name || user?.email?.split("@")[0] || "Unknown",
    };

    try {
      await addTicket(ticket);
      logActivity("create_ticket", `Incident ${ticket.id} - ${ticket.customerName}`);
      toast.success(`Incident ${category} berhasil dibuat & disimpan ke Cloud`);
      setIsFormOpen(false);
      setFormData({ ticketId: "", serpo: "", constraint: "", portText: "" });
      setSelectedRecord(null);
    } catch (error) {
      // Error already shown by hook
    }
  };

  const handleExportExcel = () => {
    const data = tickets.map((t, idx) => ({
      "No": idx + 1,
      "Incident ID": t.id,
      "Category": t.category,
      "Service ID": t.serviceId,
      "Customer Name": t.customerName,
      "Serpo": t.serpo,
      "Hostname OLT": t.hostname,
      "ID FAT": t.fatId,
      "SN ONT": t.snOnt,
      "Constraint": t.constraint,
      "Status": t.status,
      "Created": t.createdAt,
      "Incident Result": t.ticketResult,
    }));

    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(data);
      const colWidths = Object.keys(data[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...data.map((r) => String((r as Record<string, unknown>)[key] || "").length)).toString().length > 40 ? 40 : Math.max(key.length + 2, ...data.map((r) => String((r as Record<string, unknown>)[key] || "").length)),
      }));
      ws["!cols"] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "List Incident");
      XLSX.writeFile(wb, `noc_insident_${Date.now()}.xlsx`);
      toast.success("Excel berhasil diexport");
    });
  };
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<Ticket | null>(null);


  const handleSubmitManualTicket = async () => {
    if (!manualFormData.ticketId.trim()) {
      toast.error("Incident ID wajib diisi");
      return;
    }
    if (!manualFormData.constraint) {
      toast.error("Constraint wajib dipilih");
      return;
    }
    if (!manualFormData.serpo.trim()) {
      toast.error("Serpo/Tim wajib diisi");
      return;
    }

    const now = new Date();
    const category = FEEDER_CONSTRAINTS_SET.has(manualFormData.constraint) ? "FEEDER" : "RITEL";
    
    const ticketResult = generateTicketFormat(
      manualFormData.constraint,
      manualFormData.customerName.trim(),
      manualFormData.serpo.trim(),
      manualFormData.fatId.trim(),
      manualFormData.hostname.trim(),
      manualFormData.snOnt.trim(),
      manualFormData.portText || undefined
    );
    
    const ticket: Ticket = {
      id: manualFormData.ticketId.trim(),
      serviceId: manualFormData.serviceId.trim(),
      customerName: manualFormData.customerName.trim(),
      serpo: manualFormData.serpo.trim(),
      hostname: manualFormData.hostname.trim(),
      fatId: manualFormData.fatId.trim(),
      snOnt: manualFormData.snOnt.trim(),
      constraint: manualFormData.constraint,
      category,
      ticketResult,
      status: "On Progress",
      createdAt: now.toLocaleString("id-ID"),
      createdISO: now.toISOString(),
      createdByUserId: user?.id,
      createdByName: profile?.display_name || user?.email?.split("@")[0] || "Unknown",
    };

    try {
      await addTicket(ticket);
      logActivity("create_ticket", `Incident manual ${ticket.id} - ${ticket.customerName}`);
      toast.success(`Incident ${category} berhasil dibuat & disimpan ke Cloud`);
      setIsManualFormOpen(false);
      setManualFormData({
        ticketId: "",
        serviceId: "",
        customerName: "",
        serpo: "",
        hostname: "",
        fatId: "",
        snOnt: "",
        constraint: "",
        portText: "",
      });
    } catch (error) {
      // Error already shown by hook
    }
  };

  return (
    <div className="space-y-2 sm:space-y-3 md:space-y-4 max-w-full overflow-x-hidden">
      <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3">
        <h1 className="text-lg xs:text-xl sm:text-2xl font-bold">🎫 Incident Management</h1>
        <span className="text-[10px] xs:text-xs text-muted-foreground">Kelola incident NOC</span>
      </div>

      {/* Dialog for creating ticket from Preview Data */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Tiket Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Incident ID</Label>
              <Input
                value={formData.ticketId}
                onChange={(e) => setFormData({ ...formData, ticketId: e.target.value })}
                placeholder="Masukkan Incident ID (contoh: INC12345678)"
              />
            </div>
            <div>
              <Label>Serpo / Tim</Label>
              <Input
                value={formData.serpo}
                onChange={(e) => setFormData({ ...formData, serpo: e.target.value })}
                placeholder="Masukkan nama tim"
              />
            </div>
            <div>
              <Label>Constraint</Label>
              <Select
                value={formData.constraint}
                onValueChange={(value) => setFormData({ ...formData, constraint: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih constraint" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    RITEL
                  </div>
                  {ALL_CONSTRAINTS.filter(c => !FEEDER_CONSTRAINTS_SET.has(c)).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                    FEEDER (PROACTIVE NOC RETAIL)
                  </div>
                  {ALL_CONSTRAINTS.filter(c => FEEDER_CONSTRAINTS_SET.has(c)).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Show PORT text input only for PORT DOWN constraint */}
            {formData.constraint === "PORT DOWN" && (
              <div>
                <Label>Port Info (Optional)</Label>
                <Input
                  value={formData.portText}
                  onChange={(e) => setFormData({ ...formData, portText: e.target.value })}
                  placeholder="Contoh: PORT-1/1/1"
                />
              </div>
            )}
            
            {/* Preview ticket format */}
            {formData.constraint && selectedRecord && formData.serpo && (
              <div className="p-3 bg-accent/50 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  Preview Format Incident:
                </p>
                <p className="text-sm font-mono">
                  {generateTicketFormat(
                    formData.constraint,
                    String(selectedRecord.customer || ""),
                    formData.serpo.trim(),
                    String(selectedRecord.fat || ""),
                    String(selectedRecord.hostname || ""),
                    String(selectedRecord.sn || ""),
                    formData.portText || undefined
                  )}
                </p>
              </div>
            )}
            {selectedRecord && (
              <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
                <p className="text-sm font-medium">Selected Record:</p>
                <p className="text-xs text-muted-foreground">
                  Customer: {String(selectedRecord.customer || "")} | Service:{" "}
                  {String(selectedRecord.service || "")}
                </p>
              </div>
            )}
            <Button onClick={handleSubmitTicket} className="w-full">
              Simpan Insident
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="preview-data" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="preview-data">📋 Preview Data</TabsTrigger>
          <TabsTrigger value="daftar-ticket">📑 List Incident</TabsTrigger>
        </TabsList>

        <TabsContent value="preview-data" className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
          <Card className="shadow-sm border">
            <CardHeader className="py-2 px-2 sm:px-3 md:px-4 border-b bg-muted/30">
              <CardTitle className="flex items-center justify-between text-xs sm:text-sm">
                <div className="min-w-0">
                  <span>📋 Preview Data User</span>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-normal mt-0.5 truncate">
                    {isLoadingExcel ? (
                      "Memuat data..."
                    ) : excelData.length > 0 ? (
                      `✓ ${excelData.length} data tersimpan`
                    ) : (
                      <span className="flex items-center gap-1">
                        <Info className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Import via{" "}
                        <Link to="/settings" className="text-primary underline hover:no-underline">
                          Settings
                        </Link></span>
                      </span>
                    )}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 md:p-3">
              <div className="grid gap-1.5 sm:gap-2 grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
                <div>
                  <Label className="text-[9px] sm:text-[10px]">👨‍💼 Service ID</Label>
                  <Input
                    placeholder="Cari..."
                    value={searchFilters.service}
                    onChange={(e) => setSearchFilters({ ...searchFilters, service: e.target.value })}
                    className="h-6 sm:h-7 text-[10px] sm:text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[9px] sm:text-[10px]">📍 Hostname</Label>
                  <Input
                    placeholder="Cari..."
                    value={searchFilters.hostname}
                    onChange={(e) =>
                      setSearchFilters({ ...searchFilters, hostname: e.target.value })
                    }
                    className="h-6 sm:h-7 text-[10px] sm:text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[9px] sm:text-[10px]">🛠️ ID FAT</Label>
                  <Input
                    placeholder="Cari..."
                    value={searchFilters.fat}
                    onChange={(e) => setSearchFilters({ ...searchFilters, fat: e.target.value })}
                    className="h-6 sm:h-7 text-[10px] sm:text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[9px] sm:text-[10px]">💻 SN ONT</Label>
                  <Input
                    placeholder="Cari..."
                    value={searchFilters.sn}
                    onChange={(e) => setSearchFilters({ ...searchFilters, sn: e.target.value })}
                    className="h-6 sm:h-7 text-[10px] sm:text-xs"
                  />
                </div>
                <div className="col-span-2 xs:col-span-1">
                  <Label className="text-[9px] sm:text-[10px]">👤 Customer</Label>
                  <Input
                    placeholder="Cari..."
                    value={searchFilters.customer}
                    onChange={(e) =>
                      setSearchFilters({ ...searchFilters, customer: e.target.value })
                    }
                    className="h-6 sm:h-7 text-[10px] sm:text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoadingExcel ? (
            <Card className="shadow-sm border">
              <CardContent className="py-3 sm:py-4">
                <div className="text-center text-muted-foreground text-[10px] sm:text-xs">
                  <p>Memuat data Excel...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredData.length > 0 ? (
            <Card className="shadow-sm border">
              <CardHeader className="py-1.5 sm:py-2 px-2 sm:px-3 border-b bg-muted/30">
                <CardTitle className="text-xs sm:text-sm">📊 Preview Data ({filteredData.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 sm:p-2">
                <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[40vh] xs:max-h-[45vh] sm:max-h-[50vh] md:max-h-[55vh] lg:max-h-[60vh]">
                  <Table className="min-w-[500px]">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="h-5">
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">⚡ Action</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👨‍💼 Service ID</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">📍 Hostname</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">🛠️ ID FAT</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">💻 SN ONT</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👤 Customer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.slice(0, 200).map((record, idx) => (
                        <TableRow key={idx} className="h-6 sm:h-7">
                          <TableCell className="px-1 sm:px-1.5 py-0.5">
                            {!isReviewer && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-5 text-[8px] sm:text-[9px] px-1.5 sm:px-2"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setIsFormOpen(true);
                                }}
                              >
                                Pilih
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px]">{String(record.service || "")}</TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium">{String(record.hostname || "")}</TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px]">{String(record.fat || "")}</TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px]">{String(record.sn || "")}</TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">{String(record.customer || "")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border">
              <CardContent className="py-4 sm:py-6">
                <div className="text-center text-muted-foreground text-[10px] sm:text-xs">
                  <p>Belum ada data. Import data Excel via <Link to="/settings" className="text-primary underline hover:no-underline">Settings</Link></p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="daftar-ticket" className="mt-2 sm:mt-3">
          <Card className="shadow-sm border">
            <CardHeader className="py-1.5 sm:py-2 px-2 sm:px-3 border-b bg-muted/30 flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs sm:text-sm whitespace-nowrap">📋 List Incident ({filteredTickets.length})</CardTitle>
                {isLoadingTickets && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-1 sm:gap-1.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 sm:h-7 text-[9px] sm:text-[10px] px-1.5"
                  onClick={() => refetchTickets()}
                  disabled={isLoadingTickets}
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingTickets ? 'animate-spin' : ''}`} />
                </Button>
                {!isReviewer && (
                  <Dialog open={isManualFormOpen} onOpenChange={setIsManualFormOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 sm:h-7 text-[9px] sm:text-[10px] px-1.5 sm:px-2">
                        <FileEdit className="h-3 w-3 mr-0.5 sm:mr-1" />
                        <span className="hidden xs:inline">Manual</span>
                        <span className="xs:hidden">+</span>
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Input Incident Manual</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <Label>Incident ID *</Label>
                          <Input
                            value={manualFormData.ticketId}
                            onChange={(e) => setManualFormData({ ...manualFormData, ticketId: e.target.value })}
                            placeholder="INC12345678"
                          />
                        </div>
                        <div>
                          <Label>Service ID</Label>
                          <Input
                            value={manualFormData.serviceId}
                            onChange={(e) => setManualFormData({ ...manualFormData, serviceId: e.target.value })}
                            placeholder="Masukkan Service ID"
                          />
                        </div>
                      </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <Label>Customer Name</Label>
                          <Input
                            value={manualFormData.customerName}
                            onChange={(e) => setManualFormData({ ...manualFormData, customerName: e.target.value })}
                            placeholder="Nama pelanggan"
                          />
                        </div>
                        <div>
                          <Label>Serpo / Tim *</Label>
                          <Input
                            value={manualFormData.serpo}
                            onChange={(e) => setManualFormData({ ...manualFormData, serpo: e.target.value })}
                            placeholder="Nama tim"
                          />
                        </div>
                      </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <Label>Hostname OLT</Label>
                          <Input
                            value={manualFormData.hostname}
                            onChange={(e) => setManualFormData({ ...manualFormData, hostname: e.target.value })}
                            placeholder="Hostname OLT"
                          />
                        </div>
                        <div>
                          <Label>ID FAT</Label>
                          <Input
                            value={manualFormData.fatId}
                            onChange={(e) => setManualFormData({ ...manualFormData, fatId: e.target.value })}
                            placeholder="ID FAT"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>SN ONT</Label>
                        <Input
                          value={manualFormData.snOnt}
                          onChange={(e) => setManualFormData({ ...manualFormData, snOnt: e.target.value })}
                          placeholder="SN ONT"
                        />
                      </div>
                      <div>
                        <Label>Constraint *</Label>
                        <Select
                          value={manualFormData.constraint}
                          onValueChange={(value) => setManualFormData({ ...manualFormData, constraint: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih constraint" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              RITEL
                            </div>
                            {ALL_CONSTRAINTS.filter(c => !FEEDER_CONSTRAINTS_SET.has(c)).map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                              FEEDER (PROACTIVE NOC RETAIL)
                            </div>
                            {ALL_CONSTRAINTS.filter(c => FEEDER_CONSTRAINTS_SET.has(c)).map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {manualFormData.constraint === "PORT DOWN" && (
                        <div>
                          <Label>Port Info (Optional)</Label>
                          <Input
                            value={manualFormData.portText}
                            onChange={(e) => setManualFormData({ ...manualFormData, portText: e.target.value })}
                            placeholder="Contoh: PORT-1/1/1"
                          />
                        </div>
                      )}
                      
                      {manualFormData.constraint && manualFormData.serpo && (
                        <div className="p-3 bg-accent/50 rounded-lg space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Preview Format Incident:
                          </p>
                          <p className="text-sm font-mono whitespace-pre-wrap break-all">
                            {generateTicketFormat(
                              manualFormData.constraint,
                              manualFormData.customerName.trim(),
                              manualFormData.serpo.trim(),
                              manualFormData.fatId.trim(),
                              manualFormData.hostname.trim(),
                              manualFormData.snOnt.trim(),
                              manualFormData.portText || undefined
                            )}
                          </p>
                        </div>
                      )}
                      
                      <Button onClick={handleSubmitManualTicket} className="w-full">
                        Simpan Insident Manual
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 sm:h-7 text-[9px] sm:text-[10px] px-1.5 sm:px-2">
                      <FileDown className="h-3 w-3 mr-0.5 sm:mr-1" />
                      <span className="hidden xs:inline">Excel / CSV</span>
                      <span className="xs:hidden">↓</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportExcel}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Excel / CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 space-y-1.5 sm:space-y-2">
              {/* Search filter untuk Daftar Tiket */}
              <div className="flex flex-col xs:flex-row gap-1.5 sm:gap-2 xs:items-end">
                <div className="w-full xs:w-28 sm:w-40">
                  <Label className="text-[9px] sm:text-[10px]">Search By</Label>
                  <Select value={ticketSearchField} onValueChange={setTicketSearchField}>
                    <SelectTrigger className="h-6 sm:h-7 text-[9px] sm:text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="ticketId">Incident ID</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="customerType">Customer/Type</SelectItem>
                      <SelectItem value="serviceId">Service ID</SelectItem>
                      <SelectItem value="constraint">Constraint</SelectItem>
                      <SelectItem value="serpo">Serpo</SelectItem>
                      <SelectItem value="createdBy">Created By</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="created">Created</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-[9px] sm:text-[10px]">Pencarian</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder={`Cari...`}
                      value={ticketSearchQuery}
                      onChange={(e) => setTicketSearchQuery(e.target.value)}
                      className="h-6 sm:h-7 text-[10px] sm:text-xs pl-7"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[40vh] xs:max-h-[45vh] sm:max-h-[50vh] md:max-h-[55vh] lg:max-h-[60vh]">
                <Table className="min-w-[600px]">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="h-5">
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">🎫 Insident ID</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">📦 Type</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👤 Customer/Type</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👨‍💼 Service ID</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👥 Serpo</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">✍️ Create by</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">⚙️ Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground text-[8px] sm:text-[9px] py-2">
                          Belum ada tiket
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="h-6 sm:h-7 cursor-pointer hover:bg-muted/70" onClick={() => setSelectedTicketForDetail(ticket)}>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium">{ticket.id}</TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5">
                            <div>
                              <Badge
                                className={`text-[7px] sm:text-[8px] px-1 py-0 h-3 sm:h-3.5 ${
                                  ticket.category === "FEEDER"
                                    ? "bg-warning text-warning-foreground"
                                    : "bg-primary text-primary-foreground"
                                }`}
                              >
                                {ticket.category}
                              </Badge>
                              <div className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5 truncate max-w-[80px] sm:max-w-none">
                                {ticket.constraint}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">
                            {ticket.category === "FEEDER" ? (
                              ticket.constraint === "OLT DOWN" ? (
                                <span className="font-medium">{ticket.hostname}</span>
                              ) :
                              ticket.constraint === "PORT DOWN" ? (
                                <div>
                                  <div className="font-medium text-[9px] sm:text-[10px]">{ticket.ticketResult.match(/PORT - (.*?) - DOWN/)?.[1] || "PORT"}</div>
                                  <div className="text-muted-foreground text-[7px] sm:text-[8px]">{ticket.hostname}</div>
                                </div>
                              ) :
                              ticket.constraint === "FAT LOSS" || ticket.constraint === "FAT LOW RX" ? (
                                <div>
                                  <div className="font-medium text-[9px] sm:text-[10px]">{ticket.fatId}</div>
                                  <div className="text-muted-foreground text-[7px] sm:text-[8px]">{ticket.hostname}</div>
                                </div>
                              ) : ticket.constraint
                            ) : ticket.customerName}
                          </TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px]">{ticket.serviceId}</TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">{ticket.serpo}</TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">
                            <span className="text-muted-foreground">{ticket.createdByName || "-"}</span>
                          </TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5">
                            <div>
                              <StatusBadge status={ticket.status} />
                              <div className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5">
                                {ticket.createdAt}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {selectedTicketForDetail && (
        <TicketDetailDialog
          ticket={selectedTicketForDetail}
          isAdmin={isAdmin}
          isReviewer={isReviewer}
          updateTicket={updateTicket}
          deleteTicket={deleteTicket}
          open={!!selectedTicketForDetail}
          onOpenChange={(open) => { if (!open) setSelectedTicketForDetail(null); }}
        />
      )}
    </div>
  );
}
