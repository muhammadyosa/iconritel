import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="text-[11px] font-mono bg-background/70 rounded p-2 whitespace-pre-wrap break-words border border-border/60 text-foreground/90">
      {children}
    </pre>
  );
}

function Cmd({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-foreground/90 mt-2">
      <span className="text-primary">&gt;</span> {children}
    </p>
  );
}

function CodeInline({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs font-mono font-semibold text-foreground">{children}</code>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-center mt-4 mb-2 text-foreground">{children}</h3>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold mt-3 mb-1.5 text-foreground/90">{children}</p>;
}

export default function CiscoASRDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Cek MPLS L2 */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-destructive">
            Cek MPLS L2
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            MPLS (Multiprotocol Label Switching) adalah sebuah protocol yang dipakai untuk
            mengirimkan data menggunakan label yang menggantikan IP dan Mac-address.
          </p>

          <Cmd>Command untuk cek MPLS All VLAN :</Cmd>
          <CodeInline>show mpls l2transport vc</CodeInline>

          <Cmd>Command untuk cek MPLS Specific VLAN :</Cmd>
          <CodeInline>show mpls l2transport vc (VLAN)</CodeInline>
          <Code>show mpls l2transport vc 2910</Code>

          <SectionTitle>3 Kondisi MPLS Pada UPE Cisco</SectionTitle>

          <StepLabel>
            1. Status MPLS UP (ke-2 sisi antara UPE dengan NPE sudah melakukan peering MPLS)
          </StepLabel>
          <Code>{`CISCO-UPE-01#show mpls l2transport vc 2910

Local intf    Local circuit              Dest address    VC ID      Status
------------- -------------------------- --------------- ---------- ----------
VFI           VFI-2910 vfi               192.168.1.1     2910       UP

CISCO-UPE-01#`}</Code>

          <StepLabel>
            2. Status MPLS DOWN (Perangkat neighbor "NPE" belum terkonfigurasi dengan benar)
          </StepLabel>
          <Code>{`CISCO-UPE-01#show mpls l2transport vc 2910

Local intf    Local circuit              Dest address    VC ID      Status
------------- -------------------------- --------------- ---------- ----------
VFI           VFI-2910 vfi               192.168.1.1     2910       DOWN

CISCO-UPE-01#`}</Code>

          <StepLabel>
            3. Status MPLS Kosong (Peering MPLS di UPE belum terkonfigurasi dengan benar)
          </StepLabel>
          <Code>{`CISCO-UPE-01#show mpls l2transport vc 2910

Local intf    Local circuit              Dest address    VC ID      Status
------------- -------------------------- --------------- ---------- ----------

CISCO-UPE-01#`}</Code>

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            Sedikit catatan, IP yang muncul di bagian Dest address adalah IP dari NPE atau
            perangkat neighbor nya, kita bisa coba test telnet ke IP tersebut untuk
            memastikan apakah benar itu perangkat neighbor yang harus dituju.
          </p>
        </CardContent>
      </Card>

      {/* Cek EVC pada Interface */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-destructive">
            Cek EVC pada Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            EVC (Ethernet Virtual Connection/Circuit) bisa dibilang juga konfigurasi bagian
            service instance, fungsinya baca di google ya, kepanjangan soalnya kalau ditulis
            di sini. :P
          </p>

          <Cmd>Command untuk cek EVC :</Cmd>
          <CodeInline>show running-config interface (INTERFACE)</CodeInline>
          <Code>show running-config interface gigabitEthernet 0/0/1</Code>

          <Cmd>Command untuk cek EVC Specific VLAN :</Cmd>
          <CodeInline>show running-config interface (INTERFACE) | section (VLAN)</CodeInline>
          <Code>show running-config interface gigabitEthernet 0/0/1 | section 2910</Code>

          <SectionTitle>2 Cara Cek EVC Pada UPE Cisco</SectionTitle>

          <StepLabel>1. Cek keselurhan EVC dalam 1 interface</StepLabel>
          <Code>{`CISCO-UPE-01#show running-config interface gigabitEthernet 0/0/1
Building configuration...

Current configuration : 558 bytes
!
interface GigabitEthernet0/0/1
 description Trunk to OLT-01
 mtu 1998
 no ip address
 load-interval 30
 negotiation auto
 spanning-tree bpdufilter enable
 service instance 1134 ethernet
  description OLT OLT-01
  encapsulation dot1q 1134
  rewrite ingress tag pop 1 symmetric
  bridge-domain 1134
 !
 service instance 2910 ethernet
  description OLT Iconnet
  encapsulation dot1q 2910
  bridge-domain 2910 split-horizon group 1
 !
end

CISCO-UPE-01#`}</Code>

          <StepLabel>2. Cek spesifik VLAN EVC dalam 1 interface</StepLabel>
          <Code>{`CISCO-UPE-01#show running-config interface gigabitEthernet 0/0/1 | section 2910
 service instance 2910 ethernet
  description OLT Iconnet
  encapsulation dot1q 2910
  bridge-domain 2910 split-horizon group 1

CISCO-UPE-01#`}</Code>

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            Sedikit catatan, vlan yang di bagian service instance, encapsulation, dan
            bridge-domain harus sama, tidak boleh beda.
          </p>
        </CardContent>
      </Card>

      {/* Cek Mac ONT di UPE */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-destructive">
            Cek Mac ONT di UPE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Pengecekan ini tujuannya adalah untuk memverifikasi apakah mac-address ONT yang
            kita tuju sudah tembus sampai ke UPE.
          </p>

          <Cmd>Command untuk cek keseluruhan mac-address :</Cmd>
          <CodeInline>show mac-address-table</CodeInline>

          <Cmd>Command untuk cek spesifik mac-address :</Cmd>
          <CodeInline>show mac-address-table | include xxxx.xxxx.xxxx</CodeInline>
          <Code>show mac-address-table | include a1b2.c3d4.e5f6</Code>

          <SectionTitle>2 Cara Cek Mac Address Pada UPE Cisco</SectionTitle>

          <StepLabel>1. Cek keseluruhan mac address dalam UPE</StepLabel>
          <Code>{`CISCO-UPE-01#show mac-address-table

Nile Mac Address Entries

BD     mac addr          type        ports
----------------------------------------------------------------------------------------------
ALL    0000.0000.0000    STATIC      CPU
ALL    0100.0000.0000    STATIC      CPU
ALL    0100.0ccc.cccc    STATIC      CPU
ALL    0100.0ccc.cccd    STATIC      CPU
ALL    0100.0ccc.ccce    STATIC      CPU
ALL    0100.0ccd.cdce    STATIC      CPU
ALL    0100.0ccd.cdd0    STATIC      CPU
ALL    0100.0cdd.dddd    STATIC      CPU
ALL    0180.c200.0000    STATIC      CPU
ALL    0180.c200.0001    STATIC      CPU
ALL    0180.c200.0002    STATIC      CPU
ALL    0180.c200.0003    STATIC      CPU
ALL    0180.c200.0004    STATIC      CPU
ALL    0180.c200.0005    STATIC      CPU
ALL    0180.c200.0006    STATIC      CPU
ALL    0180.c200.0007    STATIC      CPU
ALL    0180.c200.0008    STATIC      CPU
ALL    0180.c200.0009    STATIC      CPU
ALL    0180.c200.000a    STATIC      CPU
ALL    0180.c200.000b    STATIC      CPU
ALL    0180.c200.000c    STATIC      CPU
ALL    0180.c200.000d    STATIC      CPU
ALL    0180.c200.000e    STATIC      CPU
ALL    0180.c200.000f    STATIC      CPU
 --More--`}</Code>

          <StepLabel>2. Cek spesifik mac address dalam UPE</StepLabel>
          <Code>{`CISCO-UPE-01#show mac-address-table | include a1b2.c3d4.e5f6
2910    a1b2.c3d4.e5f6    DYNAMIC     Gi0/0/1.Efp2910

CISCO-UPE-01#`}</Code>

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            Sedikit catatan, apabila mac-address ONT yang dituju belum muncul di UPE, ada
            kemungkinan belum adanya EVC di UPE dan konfigurasi trunking yang kurang pada
            OLT.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
