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

export default function HuaweiNE8KDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Cek VSI + VPLS */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-destructive">
            Cek VSI + VPLS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            VPLS (Virtual Private LAN Service) adalah teknologi L2 yang mengoneksikan beberapa
            single bridge domain menggunakan IP / MPLS.
          </p>

          <Cmd>Command untuk cek status VSI :</Cmd>
          <CodeInline>display vsi</CodeInline>

          <Cmd>Command untuk cek status VPLS :</Cmd>
          <CodeInline>display vpls connection</CodeInline>

          <Cmd>Command untuk cek status VPLS yang Up :</Cmd>
          <CodeInline>display vpls connection up</CodeInline>

          <Cmd>Command untuk cek status VPLS yang Down :</Cmd>
          <CodeInline>display vpls connection down</CodeInline>

          <SectionTitle>Sample Pengecekan VSI + VPLS</SectionTitle>

          <StepLabel>1. Cek Status VSI</StepLabel>
          <Code>{`HUAWEI-UPE-01>display vsi
Total VSI number is 2, 1 is up, 1 is down,
2 is LDP mode, 0 is BGP mode, 0 is BGPAD
mode, 0 is mixed mode, 0 is unspecified
mode
--------------------------------------------------------------------------
Vsi      Mem  PW    Mac      Encap     Mtu    Vsi
Name     Disc Type  Learn    Type      Value  State
--------------------------------------------------------------------------
VLAN-2910 --  ldp   qualify  ethernet  1998   up
VLAN-2990 --  ldp   qualify  ethernet  1998   down

HUAWEI-UPE-01>`}</Code>

          <StepLabel>2. Cek Koneksi VPLS</StepLabel>
          <Code>{`HUAWEI-UPE-01>display vpls connection
2 total connections,
connections: 1 up, 1 down, 2 ldp, 0 bgp, 0 bgpad

VSI Name: VLAN-2910                Signaling: ldp
VsiID  EncapType  PeerAddr      InLabel  OutLabel  VCState
2910   ethernet   192.168.1.1   8876     58326     up

VSI Name: VLAN-2990                Signaling: ldp
VsiID  EncapType  PeerAddr      InLabel  OutLabel  VCState
2990   ethernet   192.168.1.1   0        0         down

HUAWEI-UPE-01>`}</Code>

          <StepLabel>3. Cek Koneksi VPLS Yang UP</StepLabel>
          <Code>{`HUAWEI-UPE-01>display vpls connection up
1 total connections up,
connections: 1 ldp, 0 bgp, 0 bgpad

VSI Name: VLAN-2910                Signaling: ldp
VsiID  EncapType  PeerAddr      InLabel  OutLabel  VCState
2910   ethernet   192.168.1.1   8876     58326     up

HUAWEI-UPE-01>`}</Code>

          <StepLabel>4. Cek Koneksi VPLS Yang DOWN</StepLabel>
          <Code>{`HUAWEI-UPE-01>display vpls connection down
1 total connections down,
connections: 1 ldp, 0 bgp, 0 bgpad

VSI Name: VLAN-2990                Signaling: ldp
VsiID  EncapType  PeerAddr      InLabel  OutLabel  VCState
2990   ethernet   192.168.1.1   0        0         down

HUAWEI-UPE-01>`}</Code>

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            Sedikit catatan, IP yang muncul di bagian PeerAddr adalah IP dari NPE atau
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

          <Cmd>Command untuk cek EVC (pakai interface desc) :</Cmd>
          <CodeInline>display interface description</CodeInline>

          <Cmd>Command untuk cek detail EVC :</Cmd>
          <CodeInline>display ethernet uni information</CodeInline>

          <SectionTitle>2 Cara Cek EVC Pada UPE Huawei</SectionTitle>

          <StepLabel>
            1. Menggunakan display interface description, kita lihat vlan di belakang
            interface yang dituju, atau bisa dibilang sub-interface
          </StepLabel>
          <Code>{`HUAWEI-UPE-01>display interface description
---------
GE0/2/1(10G)       up   down  Trunk To OLT-01
GE0/2/1.1134(10G)  up   up    NMS OLT OLT-01
GE0/2/1.2910(10G)  up   up    ICONNET-PPPOE-2902
---------

HUAWEI-UPE-01>`}</Code>

          <StepLabel>2. Cek detail EVC keseluruhan port</StepLabel>
          <Code>{`HUAWEI-UPE-01>display ethernet uni information
---------
GigabitEthernet0/2/1.1134
 Total encapsulation number: 1
 encapsulation dot1q vid 1134
 Rewrite pop single
 Bridge-domain 1134

GigabitEthernet0/2/1.2910
 Total encapsulation number: 1
 encapsulation dot1q vid 2910
 No action
 Bridge-domain 2910
---------

HUAWEI-UPE-01>`}</Code>

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            Sedikit catatan, vlan yang di bagian interface, encapsulation, dan bridge-domain
            harus sama, tidak boleh beda.
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
          <CodeInline>display mac-address</CodeInline>

          <Cmd>Command untuk cek spesifik mac-address :</Cmd>
          <CodeInline>display mac-address | include xxxx-xxxx-xxxx</CodeInline>
          <Code>display mac-address | include a1b2-c3d4-e5f6</Code>

          <SectionTitle>2 Cara Cek Mac Address Pada UPE Huawei</SectionTitle>

          <StepLabel>1. Cek keseluruhan mac address dalam UPE</StepLabel>
          <Code>{`HUAWEI-UPE-01>display mac-address
MAC address table of slot 0:
----------------------------------------------------------------------------------------------------------------------
MAC Address       VLAN/BD/      PEVLAN  CEVLAN  Port/Peerip   Type      LSP/LSR-ID
                  VSI/SI/EVPN                                            MAC-Tunnel
----------------------------------------------------------------------------------------------------------------------
9845-62ec-xxxx    BD 13         13      -       GE0/2/1.13    dynamic   0/-
6413-abc3-xxxx    BD 1134       1134    -       GE0/2/7.1134  dynamic   0/-
5ce7-47e3-xxxx    BD 1134       1134    -       GE0/2/6.1134  dynamic   0/-
c0f6-ecb6-xxxx    BD 1134       1134    -       GE0/2/2.1134  dynamic   0/-
78cf-2fbd-xxxx    BD 1134       1134    -       GE0/2/8.1134  dynamic   0/-
30c5-0ff4-xxxx    BD 2902       -       -       GE0/2/0       dynamic   0/13396
78cf-2fbd-xxxx    BD 1134       1134    -       GE0/2/5.1134  dynamic   0/-
78cf-2fbd-xxxx    BD 1134       1134    -       GE0/2/4.1134  dynamic   0/-
e8d7-651e-xxxx    BD 2910       2910    -       GE0/2/1.2910  dynamic   0/-
a1b2-c3d4-e5f6    BD 2910       2910    -       GE0/2/1.2910  dynamic   0/-
6413-abc2-xxxx    BD 1134       1134    -       GE0/2/3.1134  dynamic   0/-
----------------------------------------------------------------------------------------------------------------------
Total matching items on slot 0 displayed = 12

HUAWEI-UPE-01>`}</Code>

          <StepLabel>2. Cek spesifik mac address dalam UPE</StepLabel>
          <Code>{`HUAWEI-UPE-01>display mac-address | include a1b2-c3d4-e5f6
Info: It will take a long time if the content you search is too much or the string
you input is too long, you can press CTRL_C to break.
MAC address table of slot 0:
----------------------------------------------------------------------------------------------------------------------
MAC Address       VLAN/BD/      PEVLAN  CEVLAN  Port/Peerip   Type      LSP/LSR-ID
                  VSI/SI/EVPN                                            MAC-Tunnel
----------------------------------------------------------------------------------------------------------------------
a1b2-c3d4-e5f6    BD 2910       2910    -       GE0/2/1.2910  dynamic   0/-
----------------------------------------------------------------------------------------------------------------------
Total matching items on slot 0 displayed = 12

HUAWEI-UPE-01>`}</Code>

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
