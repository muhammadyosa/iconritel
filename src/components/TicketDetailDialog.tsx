import { useState } from "react";
import { Trash2, Edit, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Ticket, ALL_CONSTRAINTS, FEEDER_CONSTRAINTS_SET, generateTicketFormat } from "@/types/ticket";
import { toast } from "sonner";

interface TicketDetailDialogProps {
  ticket: Ticket;
  isAdmin: boolean;
  isReviewer?: boolean;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TicketDetailDialog({
  ticket,
  isAdmin,
  isReviewer = false,
  updateTicket,
  deleteTicket,
  open: controlledOpen,
  onOpenChange,
}: TicketDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    customerName: ticket.customerName,
    serviceId: ticket.serviceId,
    hostname: ticket.hostname,
    fatId: ticket.fatId,
    snOnt: ticket.snOnt,
    serpo: ticket.serpo,
    constraint: ticket.constraint,
  });

  const handleStartEdit = () => {
    setEditData({
      customerName: ticket.customerName,
      serviceId: ticket.serviceId,
      hostname: ticket.hostname,
      fatId: ticket.fatId,
      snOnt: ticket.snOnt,
      serpo: ticket.serpo,
      constraint: ticket.constraint,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    try {
      const category = FEEDER_CONSTRAINTS_SET.has(editData.constraint) ? "FEEDER" : "RITEL";
      const ticketResult = generateTicketFormat(
        editData.constraint,
        editData.customerName,
        editData.serpo,
        editData.fatId,
        editData.hostname,
        editData.snOnt
      );

      await updateTicket(ticket.id, {
        customerName: editData.customerName,
        serviceId: editData.serviceId,
        hostname: editData.hostname,
        fatId: editData.fatId,
        snOnt: editData.snOnt,
        serpo: editData.serpo,
        constraint: editData.constraint,
        category,
        ticketResult,
      });
      toast.success("Insident berhasil diperbarui");
      setIsEditing(false);
    } catch (error) {
      // Error already shown by hook
    }
  };

  return (
    <Dialog open={controlledOpen} onOpenChange={onOpenChange}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-5 text-[7px] sm:text-[8px] px-1 sm:px-1.5">
            Detail
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Detail Insident {ticket.id}</span>
            {!isEditing && !isReviewer && (
              <Button variant="outline" size="sm" onClick={handleStartEdit} className="h-7">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Customer</Label>
                  <Input
                    value={editData.customerName}
                    onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Service ID</Label>
                  <Input
                    value={editData.serviceId}
                    onChange={(e) => setEditData({ ...editData, serviceId: e.target.value })}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Hostname OLT</Label>
                  <Input
                    value={editData.hostname}
                    onChange={(e) => setEditData({ ...editData, hostname: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">ID FAT</Label>
                  <Input
                    value={editData.fatId}
                    onChange={(e) => setEditData({ ...editData, fatId: e.target.value })}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">SN ONT</Label>
                  <Input
                    value={editData.snOnt}
                    onChange={(e) => setEditData({ ...editData, snOnt: e.target.value })}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Serpo/Tim</Label>
                  <Input
                    value={editData.serpo}
                    onChange={(e) => setEditData({ ...editData, serpo: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Constraint</Label>
                <Select
                  value={editData.constraint}
                  onValueChange={(value) => setEditData({ ...editData, constraint: value })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
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
                      FEEDER
                    </div>
                    {ALL_CONSTRAINTS.filter(c => FEEDER_CONSTRAINTS_SET.has(c)).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Preview format */}
              {editData.constraint && editData.serpo && (
                <div className="p-3 bg-accent/50 rounded-lg space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Preview Format:</p>
                  <p className="text-sm font-mono whitespace-pre-wrap break-all">
                    {generateTicketFormat(
                      editData.constraint,
                      editData.customerName,
                      editData.serpo,
                      editData.fatId,
                      editData.hostname,
                      editData.snOnt
                    )}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                  <X className="h-4 w-4 mr-1" />
                  Batal
                </Button>
                <Button onClick={handleSaveEdit} className="flex-1">
                  <Check className="h-4 w-4 mr-1" />
                  Simpan
                </Button>
              </div>
            </div>
          ) : (
            // View Mode
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                  <span className="text-muted-foreground">Create by:</span>
                  <p className="font-medium">{ticket.createdByName || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="text-xs">{ticket.createdAt}</p>
                </div>
              </div>
              <div className="pt-3 border-t">
                <span className="text-muted-foreground text-sm">Format Insident:</span>
                <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                  <p className="font-mono text-sm whitespace-pre-wrap break-all">
                    {ticket.ticketResult}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <Select
                  value={ticket.status}
                  onValueChange={async (value: any) => {
                    try {
                      await updateTicket(ticket.id, { status: value });
                      toast.success(`Status insident ${ticket.id} berhasil diubah menjadi ${value}`);
                    } catch (error) {
                      // Error already shown by hook
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Progress">Progres</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Insident?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Anda yakin ingin menghapus insident <strong>{ticket.id}</strong>? 
                          Tindakan ini tidak dapat dibatalkan dan data akan dihapus permanen dari sistem.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            try {
                              await deleteTicket(ticket.id);
                              toast.success("Insident dihapus dari Cloud");
                            } catch (error) {
                              // Error already shown by hook
                            }
                          }}
                        >
                          Ya, Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
