import { Calendar, Clock, User, ChevronRight, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
}

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
  colorClass 
}: { 
  emoji: string; 
  label: string; 
  content: string; 
  colorClass: string;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={`${colorClass} p-2.5 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {label}
              </span>
            </div>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={`${colorClass} px-2.5 pb-2.5 rounded-b-lg border border-t-0 -mt-1`}>
          <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-sans pt-2">
            {content}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export function ShiftReportCard({ report, index, total, compact = false }: ShiftReportCardProps) {
  const incidentCount = countIncidents(report);
  
  // Compact card for list view
  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="group relative rounded-lg bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer p-3 transition-all duration-200"
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
                      Shift {report.shift}
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
        <DialogContent className="max-w-lg max-h-[85vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              {new Date(report.date).toLocaleDateString("id-ID", { 
                weekday: 'long', 
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>
          <ReportDetailContent report={report} index={index} total={total} />
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
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="group relative rounded-xl bg-card border-2 border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary/40 overflow-hidden cursor-pointer"
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
                <Clock className="h-3 w-3 text-primary" />
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
      <DialogContent className="max-w-lg max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            {new Date(report.date).toLocaleDateString("id-ID", { 
              weekday: 'long', 
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </DialogTitle>
        </DialogHeader>
        <ReportDetailContent report={report} index={index} total={total} />
      </DialogContent>
    </Dialog>
  );
}

// Detail content component
function ReportDetailContent({ report, index, total }: { report: ShiftReport; index: number; total: number }) {
  return (
    <ScrollArea className="max-h-[70vh]">
      <div className="p-4 pt-2 space-y-3">
        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 rounded-lg border border-primary/20">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary capitalize">
              Shift {report.shift}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/15 rounded-lg border border-accent/20">
            <User className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-accent-foreground">
              {report.officer}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Laporan #{total - index}
          </span>
        </div>

        {/* Content sections with collapsible */}
        <div className="space-y-2">
          {report.oltDown && (
            <IncidentSection
              emoji="📟"
              label="OLT DOWN"
              content={report.oltDown}
              colorClass="bg-destructive/5 border-destructive/20 text-destructive"
            />
          )}
          
          {report.portDown && (
            <IncidentSection
              emoji="🔌"
              label="PORT DOWN"
              content={report.portDown}
              colorClass="bg-warning/5 border-warning/20 text-warning"
            />
          )}
          
          {report.fatLoss && (
            <IncidentSection
              emoji="⛓️‍💥"
              label="FAT LOSS"
              content={report.fatLoss}
              colorClass="bg-primary/5 border-primary/20 text-primary"
            />
          )}

          {report.issues && (
            <IncidentSection
              emoji="⚠️"
              label="PERMASALAHAN"
              content={report.issues}
              colorClass="bg-warning/5 border-warning/20 text-warning"
            />
          )}

          {report.notes && (
            <IncidentSection
              emoji="📝"
              label="CATATAN"
              content={report.notes}
              colorClass="bg-muted/60 border-border text-muted-foreground"
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
