import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";

interface FormState {
  sid: string;
  nama: string;
  f: string;
  s: string;
  p: string;
  id: string;
  sn: string;
  password: string;
  vlan: string;
  lineProfile: string;
  serviceProfile: string;
  gemport: string;
}

function todayPassword() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

const DEFAULTS: FormState = {
  sid: "",
  nama: "",
  f: "0",
  s: "",
  p: "",
  id: "",
  sn: "",
  password: todayPassword(),
  vlan: "",
  lineProfile: "",
  serviceProfile: "",
  gemport: "1",
};

const FIXED_HASIL = `display ont autofind all
display ont info (F) (S) (P) all
display ont-srvprofile gpon all
display ont-lineprofile gpon all`;

function buildHasilConfig(f: FormState) {
  const nama = (f.nama || "").toUpperCase().replace(/\s+/g, ".");
  return `config
interface gpon ${f.f}/${f.s}
ont add ${f.p} ${f.id} sn-auth ${f.sn}  omci ont-lineprofile-name ${f.lineProfile} ont-srvprofile-name ${f.serviceProfile} desc ${f.sid}-${nama}.

ont ipconfig ${f.p} ${f.id} pppoe vlan ${f.vlan} priority 0 user-account username ${f.sn}  password ${f.password}
ont internet-config ${f.p} ${f.id} ip-index 0
ont wan-config ${f.p} ${f.id} ip-index 0 profile-name ${f.lineProfile}
ont policy-route-config ${f.p} ${f.id} profile-name ${f.lineProfile}
ont port route ${f.p} ${f.id} eth 1 enable
ont port route ${f.p} ${f.id} eth 2 enable

quit

service-port vlan ${f.vlan} gpon ${f.f}/${f.s}/${f.p} ont ${f.id} gemport ${f.gemport} multi-service user-vlan ${f.vlan} tag-transform translate

quit`;
}

function buildVerifikasi(f: FormState) {
  return `display ont info option run-state ${f.f} ${f.s} ${f.p} ${f.id}
display ont wan-info ${f.f}/${f.s} ${f.p} ${f.id}
display mac-address port ${f.f}/${f.s}/${f.p} ont ${f.id}
display current-configuration ont ${f.f}/${f.s}/${f.p} ${f.id}

interface gpon ${f.f}/${f.s}
display ont optical-info ${f.p} ${f.id}`;
}

function CopyButton({ text }: { text: string }) {
  return (
    <Button
      size="sm"
      variant="secondary"
      className="w-full h-8 gap-1.5"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success("Tersalin ke clipboard");
      }}
    >
      <Copy className="h-3.5 w-3.5" /> Copy
    </Button>
  );
}

export default function HuaweiPPPoEGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [generated, setGenerated] = useState<FormState | null>(null);

  const update = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const reset = () => {
    setForm(DEFAULTS);
    setGenerated(null);
  };

  const gass = () => {
    if (!form.sid || !form.nama || !form.sn) {
      toast.error("SID, Nama Customer, dan Serial Number wajib diisi");
      return;
    }
    setGenerated({ ...form });
    toast.success("Config berhasil di-generate");
  };

  const active = generated ?? form;
  const hasilDynamic = generated ? buildHasilConfig(generated) : "";
  const verifikasi = generated ? buildVerifikasi(generated) : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Form */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide">
            PPPoE - Huawei
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Button onClick={reset} size="sm" variant="secondary" className="w-full h-8 gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>

          <div className="space-y-1">
            <Label className="text-xs">SID - Nama Customer :</Label>
            <div className="flex items-center gap-1">
              <Input
                value={form.sid}
                onChange={(e) => update("sid", e.target.value)}
                className="h-8 text-xs"
                placeholder="141001920968"
              />
              <span className="text-xs">-</span>
              <Input
                value={form.nama}
                onChange={(e) => update("nama", e.target.value.toUpperCase())}
                className="h-8 text-xs"
                placeholder="NANANG DWI CAHYONO"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">F/S/P/ID :</Label>
            <div className="grid grid-cols-4 gap-1">
              <Input value={form.f} onChange={(e) => update("f", e.target.value)} className="h-8 text-xs text-center" />
              <Input value={form.s} onChange={(e) => update("s", e.target.value)} className="h-8 text-xs text-center" />
              <Input value={form.p} onChange={(e) => update("p", e.target.value)} className="h-8 text-xs text-center" />
              <Input value={form.id} onChange={(e) => update("id", e.target.value)} className="h-8 text-xs text-center" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Serial Number / Password :</Label>
            <div className="grid grid-cols-2 gap-1">
              <Input
                value={form.sn}
                onChange={(e) => update("sn", e.target.value.toUpperCase())}
                className="h-8 text-xs"
                placeholder="48575443D0844AAC"
              />
              <Input
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="h-8 text-xs"
                placeholder="20260510"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">VLAN :</Label>
            <Input value={form.vlan} onChange={(e) => update("vlan", e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Line Profile Name :</Label>
            <Input
              value={form.lineProfile}
              onChange={(e) => update("lineProfile", e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Service Profile Name :</Label>
            <Input
              value={form.serviceProfile}
              onChange={(e) => update("serviceProfile", e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Gemport :</Label>
            <Input value={form.gemport} onChange={(e) => update("gemport", e.target.value)} className="h-8 text-xs" />
          </div>

          <Button onClick={gass} className="w-full h-9 gap-1.5 font-semibold">
            <Zap className="h-4 w-4" /> Gass
          </Button>
        </CardContent>
      </Card>

      {/* Hasil Config */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide">Hasil Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Button
            onClick={() => setGenerated(null)}
            size="sm"
            variant="secondary"
            className="w-full h-8 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>

          <pre className="text-[11px] font-mono bg-background/60 rounded p-2.5 whitespace-pre-wrap break-words border min-h-[100px]">
            {FIXED_HASIL}
          </pre>

          <pre className="text-[11px] font-mono bg-background/60 rounded p-2.5 whitespace-pre-wrap break-words border min-h-[260px]">
            {hasilDynamic || "Klik Gass untuk generate config..."}
          </pre>

          <CopyButton text={`${FIXED_HASIL}\n\n${hasilDynamic}`} />
        </CardContent>
      </Card>

      {/* Verifikasi */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide">Verifikasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Button
            onClick={() => setGenerated(null)}
            size="sm"
            variant="secondary"
            className="w-full h-8 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>

          <pre className="text-[11px] font-mono bg-background/60 rounded p-2.5 whitespace-pre-wrap break-words border min-h-[380px]">
            {verifikasi || "Klik Gass untuk generate verifikasi..."}
          </pre>

          <CopyButton text={verifikasi} />
        </CardContent>
      </Card>
    </div>
  );
}
