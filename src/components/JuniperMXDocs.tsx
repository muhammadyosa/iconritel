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

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground italic mt-3 leading-relaxed">{children}</p>
  );
}

export default function JuniperMXDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Cek VPLS */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">Cek VPLS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">
            VPLS (Virtual Private LAN Service) adalah teknologi L2 yang mengoneksikan beberapa single bridge domain menggunakan IP / MPLS.
          </p>
          <Cmd>Command untuk cek semua status VPLS :</Cmd>
          <CodeInline>show vpls connections</CodeInline>
          <Cmd>Command untuk cek status VPLS yang Up :</Cmd>
          <CodeInline>show vpls connections up</CodeInline>
          <Cmd>Command untuk cek status VPLS yang Down :</Cmd>
          <CodeInline>show vpls connections down</CodeInline>

          <SectionTitle>Sample Pengecekan VPLS</SectionTitle>

          <p className="font-semibold mt-2">1. Cek Semua Koneksi VPLS</p>
          <Code>{`permadi.nugraha@JUNIPER-UPE-01> show vpls connections
---------
Instance: VPLS-2910
Mesh-group connections: ICONNET
Neighbor               Type  St  Time last up          # Up trans
192.168.1.1(vpls-id 2910)  rmt   Up  Mar  4 00:36:57 2023           1
  Remote PE: 192.168.1.1, Negotiated control-word: No
  Incoming label: 542643, Outgoing label: 410089
  Negotiated PW status TLV: No
  Local interface: vt-0/1/0.1048833, Status: Up, Encapsulation: ETHERNET
  Description: Intf - vpls VPLS-2910 neighbor 192.168.1.1 vpls-id 2910
  Flow Label Transmit: No, Flow Label Receive: No

permadi.nugraha@JUNIPER-UPE-01>`}</Code>

          <p className="font-semibold mt-2">2. Cek Koneksi VPLS Yang UP</p>
          <Code>{`permadi.nugraha@JUNIPER-UPE-01> show vpls connections up
---------
Instance: VPLS-2910
Mesh-group connections: ICONNET
Neighbor               Type  St  Time last up          # Up trans
192.168.1.1(vpls-id 2910)  rmt   Up  Mar  4 00:36:57 2023           1
  Remote PE: 192.168.1.1, Negotiated control-word: No
  Incoming label: 542643, Outgoing label: 410089
  Negotiated PW status TLV: No
  Local interface: vt-0/1/0.1048833, Status: Up, Encapsulation: ETHERNET
  Description: Intf - vpls VPLS-2910 neighbor 192.168.1.1 vpls-id 2910
  Flow Label Transmit: No, Flow Label Receive: No

permadi.nugraha@JUNIPER-UPE-01>`}</Code>

          <p className="font-semibold mt-2">3. Cek Koneksi VPLS Yang DOWN</p>
          <Code>{`permadi.nugraha@JUNIPER-UPE-01> show vpls connections down
---------
Instance: VPLS-2910
Mesh-group connections: ICONNET
Neighbor               Type  St  Time last up          # Up trans
192.168.1.1(vpls-id 2910)  rmt   Dn  Mar  4 00:36:57 2023           1
  Remote PE: 192.168.1.1, Negotiated control-word: No
  Incoming label: 0, Outgoing label: 0
  Negotiated PW status TLV: No
  Local interface: vt-0/1/0.1048833, Status: Up, Encapsulation: ETHERNET
  Description: Intf - vpls VPLS-2910 neighbor 192.168.1.1 vpls-id 2910
  Flow Label Transmit: No, Flow Label Receive: No

permadi.nugraha@JUNIPER-UPE-01>`}</Code>

          <Note>
            Sedikit catatan, IP yang muncul di bagian Remote PE, atau neighbor adalah IP dari NPE atau perangkat neighbor nya, kita bisa coba test telnet ke IP tersebut untuk memastikan apakah benar itu perangkat neighbor yang harus dituju.
          </Note>
        </CardContent>
      </Card>

      {/* Cek EVC pada Interface */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">Cek EVC pada Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">
            EVC (Ethernet Virtual Connection/Circuit) bisa dibilang juga konfigurasi bagian service instance, fungsinya baca di google ya, kepanjangan soalnya kalau ditulis di sini. :P
          </p>
          <Cmd>Command untuk cek EVC (pakai interface desc) :</Cmd>
          <CodeInline>show interfaces descriptions</CodeInline>

          <SectionTitle>Sample Cek EVC Pada UPE Juniper</SectionTitle>

          <p className="font-semibold mt-2">
            1. Menggunakan display interface description, kita lihat vlan di belakang interface yang dituju, atau bisa dibilang sub-interface
          </p>
          <Code>{`permadi.nugraha@JUNIPER-UPE-01> show interfaces descriptions
---------
xe-0/1/1         up    down  TO OLT-01
xe-0/1/2.1134    up    up    NMS OLT-01
xe-0/1/2.2910    up    up    ICONNET PPPOE
---------
permadi.nugraha@JUNIPER-UPE-01>`}</Code>
        </CardContent>
      </Card>

      {/* Cek Mac ONT di UPE */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">Cek Mac ONT di UPE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">
            Pengecekan ini tujuannya adalah untuk memverifikasi apakah mac-address ONT yang kita tuju sudah tembus sampai ke UPE.
          </p>
          <Cmd>Command untuk cek keseluruhan mac-address :</Cmd>
          <CodeInline>show route forwarding-table family vpls</CodeInline>
          <Cmd>Command untuk cek spesifik mac-address :</Cmd>
          <CodeInline>show route forwarding-table family vpls | match xx:xx:xx:xx:xx:xx</CodeInline>
          <Code>{`show route forwarding-table family vpls | match a1:b2:c3:d4:e5:f6`}</Code>

          <SectionTitle>2 Cara Cek Mac Address Pada UPE Juniper</SectionTitle>

          <p className="font-semibold mt-2">1. Cek keseluruhan mac address dalam UPE</p>
          <Code>{`permadi.nugraha@JUNIPER-UPE-01> show route forwarding-table family vpls
Routing table: VPLS-2910.vpls
VPLS:
Enabled protocols: ACKed by all peers,
Destination          Type RtRef Next hop           Type Index    NhRef Netif
default              perm     0                    dscd     6297     1
30:c5:0f:f4:5c:7a/48 user     0                    indr  1048600     5
                                172.23.64.222 Push 410089  7052     2 et-0/0/0.0
5c:e7:47:7f:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:7f:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:7f:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:80:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:8b:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:8b:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:8b:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:8b:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:8b:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:8b:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:8b:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
5c:e7:47:8b:xx:xx/48 user     0                    ucst     6549    73 xe-0/1/1.2910
---------

permadi.nugraha@JATENG-MAGELANG-MX204-UPE-04>`}</Code>

          <p className="font-semibold mt-2">2. Cek spesifik mac address dalam UPE</p>
          <Code>{`permadi.nugraha@JUNIPER-UPE-01> show route forwarding-table family vpls | match a1:b2:c3:d4:e5:f6
a1:b2:c3:d4:e5:f6/48 user     0                    ucst     6549    73 xe-0/1/1.2910

permadi.nugraha@JUNIPER-UPE-01>`}</Code>

          <Note>
            Sedikit catatan, apabila mac-address ONT yang dituju belum muncul di UPE, ada kemungkinan belum adanya EVC di UPE dan konfigurasi trunking yang kurang pada OLT.
          </Note>
        </CardContent>
      </Card>
    </div>
  );
}
