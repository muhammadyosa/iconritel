import { useEffect, useState } from "react";
import { KeyRound, CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  getGitHubRepoConfig,
  getGitHubToken,
  saveGitHubSettings,
} from "@/lib/githubBackup";
import { useDataSync } from "@/contexts/DataSyncContext";

/**
 * Bottom-left "Key" button: configures the optional GitHub snapshot backup.
 * Lovable Cloud remains the live source of truth; GitHub only stores versioned
 * JSON exports of the dataset.
 */
export function GitHubKeyButton() {
  const { githubConfigured, isBackingUp, backupToGitHub } = useDataSync();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");

  useEffect(() => {
    if (!open) return;
    setToken(getGitHubToken());
    const config = getGitHubRepoConfig();
    setOwner(config?.owner ?? "");
    setRepo(config?.repo ?? "");
    setBranch(config?.branch ?? "main");
  }, [open]);

  const handleSave = () => {
    const trimmedOwner = owner.trim();
    const trimmedRepo = repo.trim();
    if (token.trim() && (!trimmedOwner || !trimmedRepo)) {
      toast.error("Owner dan nama repositori wajib diisi.");
      return;
    }
    saveGitHubSettings(
      token.trim(),
      trimmedOwner && trimmedRepo
        ? { owner: trimmedOwner, repo: trimmedRepo, branch: branch.trim() || "main" }
        : null
    );
    toast.success(token.trim() ? "Konfigurasi GitHub disimpan" : "Konfigurasi GitHub dihapus");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="fixed bottom-4 left-4 z-40 h-10 w-10 rounded-full shadow-lg border border-border/60"
              aria-label="Pengaturan backup GitHub"
            >
              <KeyRound className={githubConfigured ? "h-4 w-4 text-success" : "h-4 w-4"} />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          Backup GitHub {githubConfigured ? "(aktif)" : "(belum diatur)"}
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🔑 Backup GitHub</DialogTitle>
          <DialogDescription>
            Data live tetap disinkronkan lewat backend aplikasi. GitHub dipakai hanya untuk menyimpan
            snapshot JSON (<code>data/tickets.json</code>, <code>data/excel-data.json</code>,{" "}
            <code>data/olt-data.json</code>, <code>data/regional-team.json</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gh-token">Personal Access Token</Label>
            <Input
              id="gh-token"
              type="password"
              autoComplete="off"
              placeholder="ghp_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Token disimpan di perangkat Anda saja. Gunakan fine-grained token dengan akses tulis
              <strong> hanya</strong> ke repositori ini agar risiko tetap minimal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gh-owner">Owner</Label>
              <Input id="gh-owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gh-repo">Repository</Label>
              <Input id="gh-repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="noc-ritel" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gh-branch">Branch</Label>
            <Input id="gh-branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={!githubConfigured || isBackingUp}
            onClick={() => void backupToGitHub()}
          >
            {isBackingUp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            Backup sekarang
          </Button>
          <Button type="button" onClick={handleSave}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
