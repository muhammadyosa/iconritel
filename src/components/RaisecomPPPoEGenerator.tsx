import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";

type Brand = "Raisecom" | "ZTE" | "AIS";

interface FormState {
  sid: string;
  nama: string;
  s: string;
  p: string;
  id: string;
  sn: string;
  password: string;
  vlan: string;
  lineProfile: string;
  serviceProfile: string;
}

function todayPassword() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

const DEFAULTS: FormState = {
  sid: "",
  nama: "",
  s: "",
  p: "",
  id: "",
  sn: "",
  password: todayPassword(),
  vlan: "",
  lineProfile: "1",
  serviceProfile: "1",
};

const FIXED_HASIL = `show interface gpon-olt illegal-onu
show running-config interface gpon-olt (S)/(P)
show gpon-onu-line-profile all
show gpon-onu-service-profile all`;

function buildHasilConfig(f: FormState, brand: Brand) {
  const desc = `${f.sid}-${(f.nama || "").toUpperCase().replace(/\s+/g, ".")}`;
  const head = `config
interface gpon-olt ${f.s}/${f.p}
create gpon-onu ${f.id} sn ${f.sn} line-profile-id ${f.lineProfile} service-profile-id ${f.serviceProfile}
quit
interface gpon-onu ${f.s}/${f.p}/${f.id}
description ${desc}`;

  if (brand === "Raisecom") {
    return `${head}
quit
gpon-onu ${f.s}/${f.p}/${f.id}
iphost 1 mode pppoe
iphost 1 pppoe username ${f.sn} password ${f.password}
iphost 1 vlan ${f.vlan}
iphost 1 service internet
iphost 1 service mode route nat enable cos 0 portlist 1,2 ssidlist 1
end`;
  }
  return `${head}
end`;
}

function buildVerifikasi(f: FormState) {
  return `show gpon-onu ${f.s}/${f.p}/${f.id} transceiver
show gpon-onu ${f.s}/${f.p}/${f.id} iphost 1
show mac-address-table l2-address interface gpon-onu ${f.s}/${f.p}/${f.id}
show mac-address-table l2-address interface gpon-olt ${f.s}/${f.p} | include ${f.s}/${f.p}/${f.id}
show running-config interface gpon-olt ${f.s}/${f.p}
show running-config interface gpon-onu ${f.s}/${f.p}/${f.id}
show running-config gpon-onu ${f.s}/${f.p}/${f.id}`;
}

function buildMoban(f: FormState) {
  return `Moban set di lokasi
VLAN : ${f.vlan}
Username PPPoE : ${f.sn}
Password : ${f.password}`;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
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
      <Copy className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

export default function RaisecomPPPoEGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [brand, setBrand] = useState<Brand>("Raisecom");
  const [generated, setGenerated] = useState<{ form: FormState; brand: Brand } | null>(null);

  const update = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const reset = () => {
    setForm(DEFAULTS);
    setBrand("Raisecom");
    setGenerated(null);
  };

  const gass = () => {
    if (!form.sid || !form.nama || !form.sn) {
      toast.error("SID, Nama Customer, dan Serial Number wajib diisi");
      return;
    }
    setGenerated({ form: { ...form }, brand });
    toast.success("Config berhasil di-generate");
  };

  const hasilDynamic = generated ? buildHasilConfig(generated.form, generated.brand) : "";
  const verifikasi = generated ? buildVerifikasi(generated.form) : "";
  const moban = generated && generated.brand !== "Raisecom" ? buildMoban(generated.form) : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Form */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide">PPPoE - Raisecom</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Button onClick={reset} size="sm" variant="secondary" className="w-full h-8 gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>

          <div className="space-y-1">
            <Label className="text-xs">ONT Brand :</Label>
            <div className="flex items-center gap-3 text-xs">
              {(["Raisecom", "ZTE", "AIS"] as Brand[]).map((b) => (
                <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="brand"
                    checked={brand === b}
                    onChange={() => setBrand(b)}
                    className="accent-primary"
                  />
                  {b}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">SID - Nama Customer :</Label>
            <div className="flex items-center gap-1">
              <Input value={form.sid} onChange={(e) => update("sid", e.target.value)} className="h-8 text-xs" placeholder="SID" />
              <span className="text-xs">-</span>
              <Input
                value={form.nama}
                onChange={(e) => update("nama", e.target.value.toUpperCase())}
                className="h-8 text-xs"
                placeholder="Customer Name"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">S/P/ID :</Label>
            <div className="grid grid-cols-3 gap-1">
              <Input value={form.s} onChange={(e) => update("s", e.target.value)} className="h-8 text-xs text-center" placeholder="Slot" />
              <Input value={form.p} onChange={(e) => update("p", e.target.value)} className="h-8 text-xs text-center" placeholder="Port" />
              <Input value={form.id} onChange={(e) => update("id", e.target.value)} className="h-8 text-xs text-center" placeholder="ID" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Serial Number :</Label>
            <Input
              value={form.sn}
              onChange={(e) => update("sn", e.target.value.toUpperCase())}
              className="h-8 text-xs"
              placeholder="SN"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Password :</Label>
            <Input
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="h-8 text-xs"
              placeholder={todayPassword()}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">VLAN :</Label>
            <Input value={form.vlan} onChange={(e) => update("vlan", e.target.value)} className="h-8 text-xs" placeholder="VLAN ID" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Line Profile ID :</Label>
            <Input
              value={form.lineProfile}
              onChange={(e) => update("lineProfile", e.target.value)}
              className="h-8 text-xs"
              placeholder="lineprofile-id"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Service Profile ID :</Label>
            <Input
              value={form.serviceProfile}
              onChange={(e) => update("serviceProfile", e.target.value)}
              className="h-8 text-xs"
              placeholder="serviceprofile-id"
            />
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
          <Button onClick={() => setGenerated(null)} size="sm" variant="secondary" className="w-full h-8 gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>

          <pre className="text-[11px] font-mono bg-background/60 rounded p-2.5 whitespace-pre-wrap break-words border min-h-[100px]">
            {FIXED_HASIL}
          </pre>

          <pre className="text-[11px] font-mono bg-background/60 rounded p-2.5 whitespace-pre-wrap break-words border min-h-[260px]">
            {hasilDynamic || "Klik Gass untuk generate config..."}
          </pre>

          <CopyButton text={hasilDynamic} />
        </CardContent>
      </Card>

      {/* Verifikasi */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide">Verifikasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Button onClick={() => setGenerated(null)} size="sm" variant="secondary" className="w-full h-8 gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>

          <pre className="text-[11px] font-mono bg-background/60 rounded p-2.5 whitespace-pre-wrap break-words border min-h-[260px]">
            {verifikasi || "Klik Gass untuk generate verifikasi..."}
          </pre>

          <CopyButton text={verifikasi} label="Copy Verifikasi" />

          {moban && (
            <>
              <pre className="text-[11px] font-mono bg-background/60 rounded p-2.5 whitespace-pre-wrap break-words border min-h-[100px]">
                {moban}
              </pre>
              <CopyButton text={moban} label="Copy Moban" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
