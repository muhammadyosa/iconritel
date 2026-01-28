import { useState } from "react";
import { Download, Plus, Search, Trash2, Edit, Info, FileEdit } from "lucide-react";
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
import { useTickets } from "@/hooks/useTickets";
import {
  Ticket,
  ALL_CONSTRAINTS,
  FEEDER_CONSTRAINTS_SET,
  generateTicketFormat,
  ExcelRecord,
} from "@/types/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { sanitizeForCSV } from "@/lib/validation";
import { Link } from "react-router-dom";

export default function TicketManagement() {
  const { tickets, excelData, isLoadingExcel, addTicket, updateTicket, deleteTicket } =
    useTickets();

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
        ticket.createdAt.toLowerCase().includes(query)
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
      default: return true;
    }
  });

  const handleSubmitTicket = () => {
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
    };

    addTicket(ticket);
    toast.success(`Tiket ${category} berhasil dibuat`);
    setIsFormOpen(false);
    setFormData({ ticketId: "", serpo: "", constraint: "", portText: "" });
    setSelectedRecord(null);
  };

  const handleExportCSV = () => {
    const headers = [
      "Ticket ID",
      "Category",
      "Service ID",
      "Customer Name",
      "Serpo",
      "Hostname OLT",
      "ID FAT",
      "SN ONT",
      "Constraint",
      "Status",
      "Created",
      "Ticket Result",
    ];
    const rows = tickets.map((t) => [
      sanitizeForCSV(t.id),
      sanitizeForCSV(t.category),
      sanitizeForCSV(t.serviceId),
      sanitizeForCSV(t.customerName),
      sanitizeForCSV(t.serpo),
      sanitizeForCSV(t.hostname),
      sanitizeForCSV(t.fatId),
      sanitizeForCSV(t.snOnt),
      sanitizeForCSV(t.constraint),
      sanitizeForCSV(t.status),
      sanitizeForCSV(t.createdAt),
      sanitizeForCSV(t.ticketResult),
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noc_tickets_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  };

  const handleSubmitManualTicket = () => {
    if (!manualFormData.ticketId.trim()) {
      toast.error("Ticket ID wajib diisi");
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
    };

    addTicket(ticket);
    toast.success(`Tiket ${category} berhasil dibuat secara manual`);
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
  };

  return (
    <div className="space-y-2 sm:space-y-3 md:space-y-4 max-w-full overflow-x-hidden">
      <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3">
        <h1 className="text-lg xs:text-xl sm:text-2xl font-bold">🎫 Ticket Management</h1>
        <span className="text-[10px] xs:text-xs text-muted-foreground">Kelola tiket incident NOC</span>
      </div>

      {/* Dialog for creating ticket from Preview Data */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat Tiket Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ticket ID</Label>
              <Input
                value={formData.ticketId}
                onChange={(e) => setFormData({ ...formData, ticketId: e.target.value })}
                placeholder="Masukkan Ticket ID (contoh: INC12345678)"
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
                  Preview Format Tiket:
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
              Simpan Tiket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="preview-data" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="preview-data">📋 Preview Data</TabsTrigger>
          <TabsTrigger value="daftar-ticket">📑 Daftar Ticket</TabsTrigger>
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
                <div className="rounded-md border overflow-x-auto max-h-64 sm:max-h-72">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow className="h-5">
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">⚡ Action</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">👨‍💼 Service ID</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">📍 Hostname</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">🛠️ ID FAT</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">💻 SN ONT</TableHead>
                        <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">👤 Customer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.slice(0, 50).map((record, idx) => (
                        <TableRow key={idx} className="h-6 sm:h-7">
                          <TableCell className="px-1 sm:px-1.5 py-0.5">
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
              <CardTitle className="text-xs sm:text-sm whitespace-nowrap">📋 Daftar Tiket ({filteredTickets.length})</CardTitle>
              <div className="flex gap-1 sm:gap-1.5">
                <Dialog open={isManualFormOpen} onOpenChange={setIsManualFormOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 sm:h-7 text-[9px] sm:text-[10px] px-1.5 sm:px-2">
                      <FileEdit className="h-3 w-3 mr-0.5 sm:mr-1" />
                      <span className="hidden xs:inline">Manual</span>
                      <span className="xs:hidden">+</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Input Tiket Manual</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Ticket ID *</Label>
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                            Preview Format Tiket:
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
                        Simpan Tiket Manual
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-6 sm:h-7 text-[9px] sm:text-[10px] px-1.5 sm:px-2">
                  <Download className="h-3 w-3 mr-0.5 sm:mr-1" />
                  <span className="hidden xs:inline">CSV</span>
                  <span className="xs:hidden">↓</span>
                </Button>
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
                      <SelectItem value="ticketId">Ticket ID</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="customerType">Customer/Type</SelectItem>
                      <SelectItem value="serviceId">Service ID</SelectItem>
                      <SelectItem value="constraint">Constraint</SelectItem>
                      <SelectItem value="serpo">Serpo</SelectItem>
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
              <div className="rounded-md border overflow-x-auto max-h-64 sm:max-h-72">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="h-5">
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">🎫 Ticket ID</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">📦 Type</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">👤 Customer/Type</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">👨‍💼 Service ID</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">👥 Serpo</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">⚙️ Status</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap">⚡ Action</TableHead>
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
                        <TableRow key={ticket.id} className="h-6 sm:h-7">
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
                          <TableCell className="px-1 sm:px-1.5 py-0.5">
                            <div>
                              <StatusBadge status={ticket.status} />
                              <div className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5">
                                {ticket.createdAt}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-1 sm:px-1.5 py-0.5">
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-5 text-[7px] sm:text-[8px] px-1 sm:px-1.5">
                                    Detail
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Detail Tiket {ticket.id}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Category:</span>
                                        <p className="font-medium">{ticket.category}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Status:</span>
                                        <div className="mt-1">
                                          <StatusBadge status={ticket.status} />
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Constraint:</span>
                                        <p className="font-medium">{ticket.constraint}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Serpo/Tim:</span>
                                        <p className="font-medium">{ticket.serpo}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Customer:</span>
                                        <p className="font-medium">{ticket.customerName}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Service ID:</span>
                                        <p className="font-mono text-xs">{ticket.serviceId}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Hostname OLT:</span>
                                        <p className="font-medium">{ticket.hostname}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">ID FAT:</span>
                                        <p className="font-mono text-xs">{ticket.fatId}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">SN ONT:</span>
                                        <p className="font-mono text-xs">{ticket.snOnt}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Created:</span>
                                        <p className="text-xs">{ticket.createdAt}</p>
                                      </div>
                                    </div>
                                    <div className="pt-3 border-t">
                                      <span className="text-muted-foreground text-sm">Format Tiket:</span>
                                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                                        <p className="font-mono text-sm whitespace-pre-wrap break-all">
                                          {ticket.ticketResult}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 pt-3">
                                      <Select
                                        value={ticket.status}
                                        onValueChange={(value: any) => {
                                          updateTicket(ticket.id, { status: value });
                                          toast.success(`Status tiket ${ticket.id} berhasil diubah menjadi ${value}`);
                                        }}
                                      >
                                        <SelectTrigger className="flex-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="On Progress">On Progres</SelectItem>
                                          <SelectItem value="Critical">Critical</SelectItem>
                                          <SelectItem value="Resolved">Resolved</SelectItem>
                                          <SelectItem value="Pending">Pending</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          deleteTicket(ticket.id);
                                          toast.success("Tiket dihapus");
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Hapus
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
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
    </div>
  );
}
