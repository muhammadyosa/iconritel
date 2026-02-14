import { Calendar, Clock, User, ChevronRight, Eye, Pencil, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface ShiftReport {
  id: string;
  date: string;
  shift: string;
  officer: string;
  oltDown?: string;
  portDown?: string;
  fatLoss?: string;
  summary?: string;
  issues: string;
  notes: string;
  createdAt: string;
}

interface ShiftReportCardProps {
  report: ShiftReport;
  index: number;
  total: number;
  compact?: boolean;
  onEdit?: (id: string, data: {
    date: string;
    shift: string;
    officer: string;
    oltDown: string;
    portDown: string;
    fatLoss: string;
    issues: string;
    notes: string;
  }) => Promise<boolean>;
}

// Helper to get shift emoji
const getShiftEmoji = (shift: string) => {
  switch (shift.toLowerCase()) {
    case 'pagi': return '🌅';
    case 'siang': return '☀️';
    case 'malam': return '🌙';
    default: return '🕐';
  }
};

// Helper function to count incidents
const countIncidents = (report: ShiftReport) => {
  let count = 0;
  if (report.oltDown) count++;
  if (report.portDown) count++;
  if (report.fatLoss) count++;
  if (report.issues) count++;
  if (report.notes) count++;
  return count;
};

// Incident section component
const IncidentSection = ({ 
  emoji, 
  label, 
  content, 
  bgClass 
}: { 
  emoji: string; 
  label: string; 
  content: string; 
  bgClass: string;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={`${bgClass} p-2.5 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                {label}
              </span>
            </div>
            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={`${bgClass} px-2.5 pb-2.5 rounded-b-lg border border-t-0 -mt-1`}>
          <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-sans pt-2 text-foreground/85">
            {content}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Edit Form Component
function EditReportForm({ 
  report, 
  onSave, 
  onCancel,
  isLoading 
}: { 
  report: ShiftReport; 
  onSave: (data: {
    date: string;
    shift: string;
    officer: string;
    oltDown: string;
    portDown: string;
    fatLoss: string;
    issues: string;
    notes: string;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    date: report.date,
    shift: report.shift,
    officer: report.officer,
    oltDown: report.oltDown || "",
    portDown: report.portDown || "",
    fatLoss: report.fatLoss || "",
    issues: report.issues || "",
    notes: report.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date" className="text-xs">Tanggal</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="h-9"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shift" className="text-xs">Shift</Label>
          <Select 
            value={formData.shift} 
            onValueChange={(v) => setFormData({ ...formData, shift: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pilih Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pagi">Pagi</SelectItem>
              <SelectItem value="siang">Siang</SelectItem>
              <SelectItem value="malam">Malam</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="officer" className="text-xs">Petugas</Label>
        <Input
          id="officer"
          value={formData.officer}
          onChange={(e) => setFormData({ ...formData, officer: e.target.value })}
          placeholder="Nama petugas"
          className="h-9"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="oltDown" className="text-xs">📟 OLT DOWN</Label>
        <Textarea
          id="oltDown"
          value={formData.oltDown}
          onChange={(e) => setFormData({ ...formData, oltDown: e.target.value })}
          placeholder="Daftar OLT yang down..."
          className="min-h-[60px] text-xs resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portDown" className="text-xs">🔌 PORT DOWN</Label>
        <Textarea
          id="portDown"
          value={formData.portDown}
          onChange={(e) => setFormData({ ...formData, portDown: e.target.value })}
          placeholder="Daftar port yang down..."
          className="min-h-[60px] text-xs resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fatLoss" className="text-xs">⛓️‍💥 FAT LOSS</Label>
        <Textarea
          id="fatLoss"
          value={formData.fatLoss}
          onChange={(e) => setFormData({ ...formData, fatLoss: e.target.value })}
          placeholder="Daftar FAT yang loss..."
          className="min-h-[60px] text-xs resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="issues" className="text-xs">⚠️ PERMASALAHAN</Label>
        <Textarea
          id="issues"
          value={formData.issues}
          onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
          placeholder="Permasalahan yang terjadi..."
          className="min-h-[60px] text-xs resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs">📝 CATATAN</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Catatan tambahan..."
          className="min-h-[60px] text-xs resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1" />
          Batal
        </Button>
        <Button 
          type="submit" 
          size="sm"
          disabled={isLoading}
        >
          <Save className="h-4 w-4 mr-1" />
          {isLoading ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

export function ShiftReportCard({ report, index, total, compact = false, onEdit }: ShiftReportCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const incidentCount = countIncidents(report);
  
  const handleSave = async (data: {
    date: string;
    shift: string;
    officer: string;
    oltDown: string;
    portDown: string;
    fatLoss: string;
    issues: string;
    notes: string;
  }) => {
    if (!onEdit) return;
    setIsSaving(true);
    const success = await onEdit(report.id, data);
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  // Compact card for list view
  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ 
              scale: 1.03, 
              y: -3,
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ 
              duration: 0.15, 
              delay: index * 0.05,
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
            className="group relative rounded-lg bg-card border border-border/60 shadow-sm hover:border-primary/50 cursor-pointer p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {new Date(report.date).toLocaleDateString("id-ID", { 
                      weekday: 'short', 
                      day: 'numeric',
                      month: 'short'
                    })}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                      {getShiftEmoji(report.shift)} Shift {report.shift}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                      {report.officer}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {incidentCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-full font-medium">
                    {incidentCount} issue
                  </span>
                )}
                <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </motion.div>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-accent/10 px-4 pt-4 pb-3 pr-12 border-b border-border/50">
            <DialogHeader className="p-0">
              <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                {new Date(report.date).toLocaleDateString("id-ID", { 
                  weekday: 'long', 
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-primary/20 text-primary rounded-full border border-primary/30">
                {getShiftEmoji(report.shift)} Shift {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-muted text-foreground rounded-full border border-border">
                <User className="h-3 w-3 text-muted-foreground" />
                {report.officer}
              </span>
              {onEdit && !isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="h-7 text-xs ml-auto rounded-full"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          {isEditing ? (
            <ScrollArea className="max-h-[70vh] p-4 pt-3">
              <EditReportForm
                report={report}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
                isLoading={isSaving}
              />
            </ScrollArea>
          ) : (
            <ReportDetailContent report={report} index={index} total={total} />
          )}
        </DialogContent>
      </Dialog>
    );
  }
  
  // Full card view
  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ 
            scale: 1.02, 
            y: -4,
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ 
            duration: 0.2, 
            delay: index * 0.1,
            type: "spring",
            stiffness: 400,
            damping: 25
          }}
          className="group relative rounded-xl bg-card border-2 border-border/50 shadow-sm hover:border-primary/50 overflow-hidden cursor-pointer"
        >
          {/* Compact Header */}
          <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 px-3 py-2.5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {new Date(report.date).toLocaleDateString("id-ID", { 
                      weekday: 'short', 
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                #{total - index}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/15 rounded border border-primary/20">
                <span className="text-sm">{getShiftEmoji(report.shift)}</span>
                <span className="text-[10px] font-semibold text-primary capitalize">
                  Shift {report.shift}
                </span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 rounded border border-accent/20">
                <User className="h-3 w-3 text-accent" />
                <span className="text-[10px] font-semibold text-accent-foreground truncate max-w-[100px]">
                  {report.officer}
                </span>
              </div>
            </div>
          </div>

          {/* Compact Summary */}
          <div className="p-3">
            {incidentCount > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {report.oltDown && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-medium flex items-center gap-1">
                    📟 OLT DOWN
                  </span>
                )}
                {report.portDown && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-warning/10 text-warning rounded font-medium flex items-center gap-1">
                    🔌 PORT DOWN
                  </span>
                )}
                {report.fatLoss && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium flex items-center gap-1">
                    ⛓️‍💥 FAT LOSS
                  </span>
                )}
                {report.issues && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-warning/10 text-warning rounded font-medium flex items-center gap-1">
                    ⚠️ MASALAH
                  </span>
                )}
                {report.notes && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-medium flex items-center gap-1">
                    📝 CATATAN
                  </span>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-muted-foreground">
                <span className="text-lg">✨</span>
                <p className="text-[10px] mt-0.5">Tidak ada insiden</p>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 group-hover:text-primary transition-colors">
              <Eye className="h-3 w-3" />
              Klik untuk lihat detail
            </p>
          </div>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-accent/10 px-4 pt-4 pb-3 pr-12 border-b border-border/50">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              {new Date(report.date).toLocaleDateString("id-ID", { 
                weekday: 'long', 
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-primary/20 text-primary rounded-full border border-primary/30">
              {getShiftEmoji(report.shift)} Shift {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-muted text-foreground rounded-full border border-border">
              <User className="h-3 w-3 text-muted-foreground" />
              {report.officer}
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border/50">
              Laporan #{total - index}
            </span>
            {onEdit && !isEditing && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="h-7 text-xs ml-auto rounded-full"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
        {isEditing ? (
          <ScrollArea className="max-h-[70vh] p-4 pt-3">
            <EditReportForm
              report={report}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              isLoading={isSaving}
            />
          </ScrollArea>
        ) : (
          <ReportDetailContent report={report} index={index} total={total} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Detail content component
function ReportDetailContent({ report, index, total }: { report: ShiftReport; index: number; total: number }) {
  return (
    <ScrollArea className="max-h-[70vh]">
      <div className="p-4 pt-3 space-y-2.5">
        {/* Content sections with collapsible */}
        <div className="space-y-2">
          {report.oltDown && (
            <IncidentSection
              emoji="📟"
              label="OLT DOWN"
              content={report.oltDown}
              bgClass="bg-destructive/5 border-destructive/20"
            />
          )}
          
          {report.portDown && (
            <IncidentSection
              emoji="🔌"
              label="PORT DOWN"
              content={report.portDown}
              bgClass="bg-warning/5 border-warning/20"
            />
          )}
          
          {report.fatLoss && (
            <IncidentSection
              emoji="⛓️‍💥"
              label="FAT LOSS"
              content={report.fatLoss}
              bgClass="bg-primary/5 border-primary/20"
            />
          )}

          {report.issues && (
            <IncidentSection
              emoji="⚠️"
              label="PERMASALAHAN"
              content={report.issues}
              bgClass="bg-warning/5 border-warning/20"
            />
          )}

          {report.notes && (
            <IncidentSection
              emoji="📝"
              label="CATATAN"
              content={report.notes}
              bgClass="bg-muted/60 border-border"
            />
          )}

          {/* Empty state */}
          {!report.oltDown && !report.portDown && !report.fatLoss && !report.issues && !report.notes && (
            <div className="text-center py-8 text-muted-foreground">
              <span className="text-3xl mb-2 block">✨</span>
              <p className="text-sm">Tidak ada laporan insiden</p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}