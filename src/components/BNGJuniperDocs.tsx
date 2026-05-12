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
  return <code className="text-xs font-mono font-semibold text-foreground">{children}</code>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-center mt-4 mb-2 text-foreground">{children}</h3>;
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold mt-3 mb-1.5 text-foreground/90">{children}</p>;
}

export default function BNGJuniperDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Cek IP User */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-destructive">
            Cek IP User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Cara ini digunakan untuk mencari IP user dan bandwidth yang dialokasikan ke user.
          </p>

          <Cmd>Command cek IP by SN :</Cmd>
          <CodeInline>show subscribers user-name (SN) extensive</CodeInline>
          <Code>show subscribers user-name 48575443AXXXYYY extensive</Code>

          <Cmd>Command cek IP by MAC address :</Cmd>
          <CodeInline>show subscribers user-name (MAC) extensive</CodeInline>
          <Code>show subscribers mac-address a1:b2:c3:d4:e5:f6 extensive</Code>

          <SectionTitle>Sample Pengecekan IP User</SectionTitle>

          <StepLabel>1. Cek IP user by serial number</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> show subscribers user-name 48575443AXXXYYY extensive
Type: PPPoE
User Name: 48575443AXXXYYY
IP Address: 10.10.75.128
IP Netmask: 255.255.255.255
Primary DNS Address: 10.156.0.1
Secondary DNS Address: 202.162.220.110
Logical System: default
Routing Instance: default
Interface: pp0.1234567890
Interface type: Dynamic
Underlying Interface: ae4.0123456789
Dynamic Profile Name: PPPoE-Baru
Dynamic Profile Version: 1
MAC Address: a1:b2:c3:d4:e5:f6
State: Active
Radius Accounting ID: 86794430
Session ID: 86794430
PFE Flow ID: 627910
VLAN Id: 2910
Login Time: 2023-04-11 10:00:34 WIB
IP Address Pool: ZIMBABWE-1
IPv4 Input Filter Name: BC-10M-IN-pp0.1234567890-in
IPv4 Output Filter Name: BC-10M-OUT-pp0.1234567890-out
Accounting interval: 600
Dynamic configuration:
  junos-cos-traffic-control-profile: SUBS-RET10M
  junos-input-filter: BC-10M-IN
  junos-interface-set-name: RET-10M
  junos-output-filter: BC-10M-OUT

permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>
          <p className="text-[11px] text-muted-foreground italic mt-1">
            Bisa dilihat baris <span className="font-semibold text-foreground">IP Address</span>{" "}
            adalah IP yang didapat oleh ONT user, dan bandwidth yang dialokasikan untuk user
            tersebut.
          </p>

          <StepLabel>2. Cek IP user by MAC-Address</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> show subscribers mac-address a1:b2:c3:d4:e5:f6 extensive
Type: PPPoE
User Name: 48575443AXXXYYY
IP Address: 10.10.75.128
IP Netmask: 255.255.255.255
Primary DNS Address: 10.156.0.1
Secondary DNS Address: 202.162.220.110
Logical System: default
Routing Instance: default
Interface: pp0.1234567890
Interface type: Dynamic
Underlying Interface: ae4.0123456789
Dynamic Profile Name: PPPoE-Baru
Dynamic Profile Version: 1
MAC Address: a1:b2:c3:d4:e5:f6
State: Active
Radius Accounting ID: 86794430
Session ID: 86794430
PFE Flow ID: 627910
VLAN Id: 2910
Login Time: 2023-04-11 10:00:34 WIB
IP Address Pool: ZIMBABWE-1
IPv4 Input Filter Name: BC-10M-IN-pp0.1234567890-in
IPv4 Output Filter Name: BC-10M-OUT-pp0.1234567890-out
Accounting interval: 600
Dynamic configuration:
  junos-cos-traffic-control-profile: SUBS-RET10M
  junos-input-filter: BC-10M-IN
  junos-interface-set-name: RET-10M
  junos-output-filter: BC-10M-OUT

permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>
          <p className="text-[11px] text-muted-foreground italic mt-1">
            Bisa dilihat baris <span className="font-semibold text-foreground">IP Address</span>{" "}
            adalah IP yang didapat oleh ONT user, dan bandwidth yang dialokasikan untuk user
            tersebut.
          </p>
        </CardContent>
      </Card>

      {/* Cek Kapasitas VLAN - List Domain */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-destructive">
            Cek Kapasitas VLAN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Sebelum kita cek kapasitas VLAN, kita perlu cek untuk list domain terlebih dahulu,
            domain di sini adalah penamaan variabel untuk setiap VLAN.
          </p>

          <Cmd>Command untuk cek list domain :</Cmd>
          <CodeInline>show configuration | find sub-domain</CodeInline>

          <SectionTitle>Sample Pengecekan List Domain</SectionTitle>

          <StepLabel>1. Cek list domain</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> show configuration | find sub-domain
sub-domain VLAN2901 {
    address-pool AFRICA;
    qualifier {
        vlan-id-list 2901;
    }
}
sub-domain VLAN2902 {
    address-pool PAKISTAN;
    qualifier {
        vlan-id-list 2902;
    }
}
sub-domain VLAN2903 {
    address-pool INDIA;
    qualifier {
        vlan-id-list 2903;
    }
}
sub-domain VLAN2904 {
    address-pool SINGAPURA;
    qualifier {
        vlan-id-list 2904;
    }
}
sub-domain VLAN2910 {
    address-pool ZIMBABWE;
    qualifier {
        vlan-id-list 2933;
    }
}
sub-domain VLAN2911 {
    address-pool DENMARK;
    qualifier {
        vlan-id-list 2911;
    }
}
sub-domain VLAN2912 {
    address-pool ITALIA;
    qualifier {
        vlan-id-list 2912;
    }
permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>
          <p className="text-[11px] text-muted-foreground italic mt-2">
            Data yang perlu kita ambil untuk melakukan pengecekan kapasitas VLAN adalah data dari{" "}
            <span className="font-semibold text-foreground">address-pool</span>.
          </p>
        </CardContent>
      </Card>

      {/* Cek Kapasitas VLAN - Address Pool Detail */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-destructive">
            Cek Kapasitas VLAN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Setelah kita mendapatkan data domain sebelumnya, kita bisa melanjutkan untuk mengecek
            detail address pool yang ingin kita cek, nanti akan muncul kapasitas user dalam 1
            domain.
          </p>

          <Cmd>Command untuk cek detail Address Pool :</Cmd>
          <CodeInline>
            show network-access aaa statistics address-assignment pool (ADDRESS-POOL)
          </CodeInline>
          <Code>show network-access aaa statistics address-assignment pool ZIMBABWE</Code>

          <SectionTitle>Sample Pengecekan Kapasitas VLAN</SectionTitle>

          <StepLabel>
            2. Cek kapasitas VLAN 2910, di mana VLAN 2910 menggunakan address-pool ZIMBABWE
          </StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> show network-access aaa statistics address-assignment pool ZIMBABWE
Address assignment statistics
  Pool Name: ZIMBABWE
  Out of Memory: 0
  Out of Addresses: 262272
  Address total: 4081
  Addresses in use: 3896
  Address Usage (percent): 95
  Pool drain configured: no

permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>

          <ul className="text-[11px] text-muted-foreground mt-2 space-y-1 list-disc pl-4">
            <li>
              <span className="font-semibold text-foreground">Address Usage</span> adalah persentase
              kapasitas user yang ada dalam VLAN tersebut.
            </li>
            <li>
              <span className="font-semibold text-foreground">Address total</span> adalah kapasitas
              user maksimal dalam 1 VLAN tersebut.
            </li>
            <li>
              <span className="font-semibold text-foreground">Addresses in use</span> adalah
              kapasitas user yang sudah online dalam 1 VLAN tersebut.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
