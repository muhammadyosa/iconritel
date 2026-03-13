import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Shield, User, Users, Clock, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Activity, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getActionLabel, useActivityLog } from "@/hooks/useActivityLog";

interface UserActivity {
  user_id: string;
  action: string;
  detail: string | null;
  created_at: string;
}

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_online: string | null;
  is_approved: boolean;
  role: "admin" | "noc" | "reviewer" | "intern";
  lastAction?: UserActivity;
}

export function UserManagement() {
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const { logActivity } = useActivityLog();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles, roles, and latest activity in parallel
      const [profilesResult, rolesResult, activityResult] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("user_activity_logs").select("*").order("created_at", { ascending: false }).limit(1000),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;

      // Build a map of latest activity per user
      const latestActivityMap = new Map<string, UserActivity>();
      if (!activityResult.error && activityResult.data) {
        for (const log of activityResult.data) {
          const activity = log as unknown as UserActivity;
          if (!latestActivityMap.has(activity.user_id)) {
            latestActivityMap.set(activity.user_id, activity);
          }
        }
      }

      // Merge profiles with roles and activity
      const usersWithRoles: UserWithRole[] = (profilesResult.data || []).map((profile) => {
        const userRole = rolesResult.data?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          last_online: profile.last_online as string | null,
          is_approved: (profile as any).is_approved ?? false,
          role: (userRole?.role as "admin" | "noc" | "reviewer" | "intern") || "noc",
          lastAction: latestActivityMap.get(profile.user_id),
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching users:", error);
      }
      toast.error("Gagal memuat daftar user");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleRoleChange = async (userId: string, newRole: "admin" | "noc" | "reviewer" | "intern") => {
    setUpdatingUserId(userId);
    try {
      // Get current role for logging
      const currentUser = users.find((u) => u.user_id === userId);
      const oldRole = currentUser?.role || "noc";

      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Log the role change for audit trail
      const { data: sessionData } = await supabase.auth.getSession();
      const changedBy = sessionData?.session?.user?.id;
      
      if (changedBy) {
        await supabase.from("role_change_logs").insert({
          user_id: userId,
          changed_by: changedBy,
          old_role: oldRole,
          new_role: newRole,
        });
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );

      toast.success(`Role berhasil diubah ke ${newRole}`);
      logActivity("change_role", `${currentUser?.email} → ${newRole}`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating role:", error);
      }
      toast.error("Gagal mengubah role user");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: !currentStatus } as any)
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, is_approved: !currentStatus } : u
        )
      );

      const targetUser = users.find((u) => u.user_id === userId);
      toast.success(
        !currentStatus
          ? `${targetUser?.display_name || targetUser?.email} telah disetujui`
          : `Akses ${targetUser?.display_name || targetUser?.email} dicabut`
      );
      logActivity(
        !currentStatus ? "approve_user" : "revoke_user",
        targetUser?.email || userId
      );
    } catch (error) {
      toast.error("Gagal mengubah status persetujuan");
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditDisplayName(user.display_name || "");
  };

  const handleSaveDisplayName = async () => {
    if (!editingUser) return;

    const trimmedName = editDisplayName.trim();
    if (!trimmedName) {
      toast.error("Nama tidak boleh kosong");
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmedName })
        .eq("user_id", editingUser.user_id);

      if (error) throw error;

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === editingUser.user_id
            ? { ...u, display_name: trimmedName }
            : u
        )
      );

      toast.success("Username berhasil diperbarui");
      logActivity("edit_username", `${editingUser.email} → ${trimmedName}`);
      setEditingUser(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating display name:", error);
      }
      toast.error("Gagal memperbarui username");
    } finally {
      setIsSavingName(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const isUserOnline = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins < 5;
  };

  const formatLastOnline = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) {
      return "Online";
    } else if (diffMins < 60) {
      return `${diffMins} menit lalu`;
    } else if (diffHours < 24) {
      return `${diffHours} jam lalu`;
    } else if (diffDays < 7) {
      return `${diffDays} hari lalu`;
    } else {
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    }
  };

  const toggleSort = () => {
    if (sortOrder === null) {
      setSortOrder("desc"); // Most recent first
    } else if (sortOrder === "desc") {
      setSortOrder("asc"); // Oldest first
    } else {
      setSortOrder(null); // Reset to default
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (sortOrder === null) return 0;
    
    const aTime = a.last_online ? new Date(a.last_online).getTime() : 0;
    const bTime = b.last_online ? new Date(b.last_online).getTime() : 0;
    
    if (sortOrder === "desc") {
      return bTime - aTime; // Most recent first
    } else {
      return aTime - bTime; // Oldest first
    }
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Akses Ditolak</p>
            <p className="text-sm">Hanya admin yang dapat mengakses halaman ini</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              💻 User Management
            </CardTitle>
            <CardDescription>
              Kelola user dan role akses sistem ({users.length} user terdaftar)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tidak ada user terdaftar</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                <TableRow>
                  <TableHead className="w-10 p-2"></TableHead>
                  <TableHead className="p-2">User</TableHead>
                  <TableHead className="p-2 w-[80px]">Status</TableHead>
                  <TableHead className="p-2 w-[100px]">Role</TableHead>
                  <TableHead className="p-2 w-[110px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium hover:bg-transparent text-xs"
                      onClick={toggleSort}
                    >
                      Online
                      {sortOrder === null && <ArrowUpDown className="ml-1 h-3 w-3" />}
                      {sortOrder === "desc" && <ArrowDown className="ml-1 h-3 w-3" />}
                      {sortOrder === "asc" && <ArrowUp className="ml-1 h-3 w-3" />}
                    </Button>
                  </TableHead>
                  <TableHead className="p-2 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-xs">
                      <Activity className="h-3 w-3" />
                      Last Action
                    </div>
                  </TableHead>
                  <TableHead className="p-2 hidden xl:table-cell w-[90px] text-xs">Bergabung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="p-2">
                      <div className="relative">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(user.display_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        {isUserOnline(user.last_online) && (
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-xs truncate">
                            {user.display_name || "—"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 flex-shrink-0"
                            onClick={() => handleEditUser(user)}
                            title="Edit username"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                        {/* Show last action inline on smaller screens */}
                        <div className="lg:hidden mt-0.5">
                          {user.lastAction ? (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {getActionLabel(user.lastAction.action)}
                              {user.lastAction.detail && ` · ${user.lastAction.detail}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 px-1.5 text-[11px] gap-0.5 ${
                          user.is_approved
                            ? "text-green-600 hover:text-red-600"
                            : "text-red-600 hover:text-green-600"
                        }`}
                        onClick={() => handleToggleApproval(user.user_id, user.is_approved)}
                        title={user.is_approved ? "Cabut akses" : "Setujui user"}
                      >
                        {user.is_approved ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">{user.is_approved ? "OK" : "No"}</span>
                      </Button>
                    </TableCell>
                    <TableCell className="p-2">
                      <Select
                        value={user.role}
                        onValueChange={(value: "admin" | "noc" | "reviewer" | "intern") =>
                          handleRoleChange(user.user_id, value)
                        }
                        disabled={updatingUserId === user.user_id}
                      >
                        <SelectTrigger className="w-[90px] h-7 text-xs">
                          {updatingUserId === user.user_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Shield className="h-3 w-3 text-primary" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="noc">
                            <div className="flex items-center gap-1.5 text-xs">
                              <User className="h-3 w-3 text-muted-foreground" />
                              NOC
                            </div>
                          </SelectItem>
                          <SelectItem value="reviewer">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Users className="h-3 w-3 text-amber-500" />
                              Reviewer
                            </div>
                          </SelectItem>
                          <SelectItem value="intern">
                            <div className="flex items-center gap-1.5 text-xs">
                              <User className="h-3 w-3 text-emerald-500" />
                              Intern
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2 text-xs text-muted-foreground">
                      {user.last_online ? (
                        isUserOnline(user.last_online) ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] px-1.5 py-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                            Online
                          </Badge>
                        ) : (
                          <span className="text-[11px]">
                            {formatLastOnline(user.last_online)}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-xs hidden lg:table-cell">
                      {user.lastAction ? (
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-medium text-foreground text-[11px]">
                            {getActionLabel(user.lastAction.action)}
                          </div>
                          {user.lastAction.detail && (
                            <div className="text-muted-foreground truncate max-w-[150px] text-[10px]" title={user.lastAction.detail}>
                              {user.lastAction.detail}
                            </div>
                          )}
                          <div className="text-muted-foreground/70 text-[10px]">
                            {formatLastOnline(user.lastAction.created_at)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-[11px] text-muted-foreground hidden xl:table-cell">
                      {new Date(user.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Role Legend */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-3">Keterangan Role:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Badge variant="default" className="mt-0.5">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
              <span className="text-xs text-muted-foreground">
                Akses penuh: dapat menghapus tiket, laporan shift, dan mengelola user
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">
                <User className="h-3 w-3 mr-1" />
                NOC
              </Badge>
              <span className="text-xs text-muted-foreground">
                Akses standar: dapat membuat dan mengedit tiket & laporan
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 border-amber-500/50 text-amber-600">
                <Users className="h-3 w-3 mr-1" />
                Reviewer
              </Badge>
              <span className="text-xs text-muted-foreground">
                Hanya lihat: tidak dapat membuat atau mengedit data (view only)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 border-emerald-500/50 text-emerald-600">
                <User className="h-3 w-3 mr-1" />
                Intern
              </Badge>
              <span className="text-xs text-muted-foreground">
                Akses terbatas: hanya Dashboard, Incident Management, dan List Team (view only)
              </span>
            </div>
          </div>
        </div>

        {/* Edit Username Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Username</DialogTitle>
              <DialogDescription>
                Ubah nama tampilan untuk {editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Username</Label>
                <Input
                  id="displayName"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Masukkan nama tampilan"
                  maxLength={100}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={isSavingName}
              >
                Batal
              </Button>
              <Button onClick={handleSaveDisplayName} disabled={isSavingName}>
                {isSavingName && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
