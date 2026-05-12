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

export default function BNGHuaweiDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Cek IP & Status User */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-foreground">
            Cek IP &amp; Status User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Tutorial ini berfungsi untuk melakukan status user yang akan kita cari, mulai dari IP,
            bandwidth, dan lainnya, terutama ketika ONT crossbrand.
          </p>

          <Cmd>Command untuk cek IP user by serial number :</Cmd>
          <CodeInline>display access-user username (SN)</CodeInline>
          <Code>display access-user username 48575443AXXXYYY</Code>

          <Cmd>Command untuk cek detail user by serial number :</Cmd>
          <CodeInline>display access-user username (SN) verbose</CodeInline>
          <Code>display access-user username 48575443AXXXYYY verbose</Code>

          <Cmd>Command untuk cek IP user IPOE by serial number :</Cmd>
          <CodeInline>display access-user username | include (SN)</CodeInline>
          <Code>display access-user username | include 48575443AXXXYYY</Code>

          <Cmd>Command untuk cek IP user by MAC address :</Cmd>
          <CodeInline>display access-user mac-address (mac-address)</CodeInline>
          <Code>display access-user mac-address a1b2-c3d4-e5f6</Code>

          <SectionTitle>Sample Pengecekan IP User</SectionTitle>

          <StepLabel>1. Cek IP user by serial number</StepLabel>
          <Code>{`HUAWEI-BNG-01>display access-user username 48575443AXXXYYY
------------------------------------------------------------------------------
UserID  Username           Interface         IP address     MAC
        Vlan               IPv6 address      Access type
------------------------------------------------------------------------------
1       48575443AXXXYYY    Eth-Trunk3.2910   10.10.10.10    a1b2-c3d4-e5f6
        2910/-             -                 PPPoE
------------------------------------------------------------------------------
Normal users      : 1
RUI Local users   : 0
RUI Remote users  : 0
Total users       : 1
HUAWEI-BNG-01>`}</Code>

          <StepLabel>
            2. Cek detail user by serial number, command ini bisa melihat status user secara detail
            termasuk IP, subnet mask, gateway, bahkan bandwidth yang di setting di radius server.
          </StepLabel>
          <Code>{`HUAWEI-BNG-01>display access-user username 48575443AXXXYYY verbose
-------------------------------------------------------------------
Basic:
  User access index              : 1
  State                          : Used
  User name                      : 48575443AXXXYYY
  Domain name                    : 2910-zimbabwe
  User backup state              : No
  RUI user state                 : -
  User access interface          : Eth-Trunk3.2910
  User access physical interface : 100GE0/3/1
  User session (limit,online)    : (1,1)
  User access PeVlan/CeVlan      : 2910/-
  User access slot               : 0
  User MAC                       : a1b2-c3d4-e5f6
  User IP address                : 10.10.10.10
  User IP netmask                : 255.255.255.255
  User gateway address           : 10.10.0.1
  User Primary-DNS               : 103.144.171.171
  User Secondary-DNS             : 202.162.220.110
-------------------------------------------------------------------
ACL&QoS:
  Inbound  QOS-profile-name      : ret100mb(Radius)
  Outbound QOS-profile-name      : ret100mb(Radius)
  Inbound  qos configuration     : User-CAR
  Inbound  cir                   : 5120(kbps)
  Inbound  pir                   : 102400(kbps)
  Inbound  cbs                   : 957440(bytes)
  Inbound  pbs                   : 19148800(bytes)
  Outbound qos configuration     : User-CAR
  Outbound cir                   : 5120(kbps)
  Outbound pir                   : 102400(kbps)
  Outbound cbs                   : 957440(bytes)
HUAWEI-BNG-01>`}</Code>

          <StepLabel>3. Cek IP user IPOE by serial number</StepLabel>
          <Code>{`HUAWEI-BNG-01>display access-user username | include 48575443AXXXYYY
------------------------------------------------------------------------------
UserID  Username                   Interface         IP address     MAC
        Vlan                       IPv6 address      Access type
------------------------------------------------------------------------------
2       trunk 0/2/1:4096.28...     Eth-Trunk1.2801   10.10.10.10    a1b2-c3d4-e5f6
        2801/-                     -                 IPOE
------------------------------------------------------------------------------
Normal users      : 1
RUI Local users   : 0
RUI Remote users  : 0
Total users       : 1
HUAWEI-BNG-01>`}</Code>

          <StepLabel>
            4. Cek IP user by MAC address, command ini bisa melihat status user secara detail
            termasuk IP, subnet mask, gateway, bahkan bandwidth yang di setting di radius server.
          </StepLabel>
          <Code>{`HUAWEI-BNG-01>display access-user mac-address a1b2-c3d4-e5f6
------------------------------------------------------------------------------
  User access index              : 2
  State                          : Used
  User name                      : trunk 0/2/1:4096.2801 RC-OLT-01/48575443AXXXYYY@ret10m
  Domain name                    : ret10m
  User backup state              : No
  RUI user state                 : -
  User access interface          : Eth-Trunk1.2801
  User access physical interface : GigabitEthernet0/1/1
  User access PeVlan/CeVlan      : 2801/-
  User access slot               : 0
  User MAC                       : a1b2-c3d4-e5f6
  User IP address                : 10.10.10.10
  User IP netmask                : 255.255.255.255
  User gateway address           : 10.10.0.1
  User Primary-DNS               : 103.144.171.171
  User Secondary-DNS             : 202.162.220.110
  User Authen IP Type            : ipv4/-/-
------------------------------------------------------------------------------
  Inbound  QOS-profile-name      : ret10mb
  Outbound QOS-profile-name      : ret10mb
  Inbound  qos configuration     : User-CAR
  Inbound  cir                   : 512(kbps)
  Inbound  pir                   : 10240(kbps)
  Inbound  cbs                   : 95744(bytes)
  Inbound  pbs                   : 1914880(bytes)
  Outbound qos configuration     : User-CAR
  Outbound cir                   : 512(kbps)
  Outbound pir                   : 10240(kbps)
  Outbound cbs                   : 95744(bytes)
  Outbound pbs                   : 1914880(bytes)
HUAWEI-BNG-01>`}</Code>

          <p className="text-[11px] text-muted-foreground italic mt-2">
            Sebenarnya ada banyak opsi yang bisa kita gunakan untuk mengecek IP dan status user,
            tapi command di atas adalah yang sering digunakan untuk verifikasi.
          </p>
        </CardContent>
      </Card>

      {/* Cek Failed Reason */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-foreground">
            Cek Failed Reason
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Cara ini digunakan untuk mengetahui log atau history alasan kenapa ONT tidak
            mendapatkan IP dari server, perlu juga untuk dilihat waktu terjadinya error tersebut.
          </p>

          <Cmd>Command untuk cek by serial number :</Cmd>
          <CodeInline>display aaa online-fail-record username (SN)</CodeInline>
          <Code>display aaa online-fail-record username 48575443AXXXYYY</Code>

          <Cmd>Command untuk cek by MAC address :</Cmd>
          <CodeInline>display aaa online-fail-record mac-address (mac-address)</CodeInline>
          <Code>display aaa online-fail-record mac-address a1b2-c3d4-e5f6</Code>

          <SectionTitle>Sample Pengecekan Failed User</SectionTitle>

          <StepLabel>1. Cek by serial number</StepLabel>
          <Code>{`HUAWEI-BNG-01>display aaa online-fail-record username 48575443AXXXYYY
------------------------------------------------------------------------------
  User name                  : 48575443AXXXYYY
  Domain name                : 2910-zimbabwe
  User MAC                   : a1b2-c3d4-e5f6
  User access type           : PPPoE
  User interface             : Eth-Trunk3.2910
  User access PeVlan/CeVlan  : 2910/-
  User IP address            : -
  User ID                    : 1
  User authen state          : Authened
  User acct state            : AcctIdle
  User author state          : AuthorIdle
  User login time            : 2023-04-08 22:39:08
  Online fail reason         : RADIUS authentication reject
-------------------------------------------------------------------
HUAWEI-BNG-01>`}</Code>

          <StepLabel>2. Cek by MAC address</StepLabel>
          <Code>{`HUAWEI-BNG-01>display aaa online-fail-record mac-address a1b2-c3d4-e5f6
------------------------------------------------------------------------------
  User name                  : 48575443AXXXYYY
  Domain name                : 2910-zimbabwe
  User MAC                   : a1b2-c3d4-e5f6
  User access type           : PPPoE
  User interface             : Eth-Trunk3.2910
  User access PeVlan/CeVlan  : 2910/-
  User IP address            : -
  User ID                    : 1
  User authen state          : Authened
  User acct state            : AcctIdle
  User author state          : AuthorIdle
  User login time            : 2023-04-08 22:39:08
  Online fail reason         : RADIUS authentication reject
-------------------------------------------------------------------
HUAWEI-BNG-01>`}</Code>

          <p className="text-[11px] text-muted-foreground italic mt-2">
            Untuk output kedua command tersebut sebenarnya sama saja, cuma metode pengecekannya
            saja yang membutuhkan data berbeda. Kesimpulannya pada waktu di User login time
            tersebut, user mengalami kendala sesuai pada Online fail reason tertera, semisal pada
            jam 22:39 si user pernah mengalami kendala, tapi pada saat jam 22:40 user sudah aman,
            log tersebut masih akan menampilkan reason yang sama.
          </p>
        </CardContent>
      </Card>

      {/* Cek Kapasitas User Dalam 1 VLAN */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-foreground">
            Cek Kapasitas User Dalam 1 VLAN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Cara ini dipakai untuk melihat kapasitas user yang berada dalam VLAN tertentu, gunanya
            untuk mengantisipasi keluhan internet lambat atau IP yang mental karena user terlalu
            penuh.
          </p>

          <Cmd>Command untuk cek routing instance :</Cmd>
          <CodeInline>display ip-pool pool-usage</CodeInline>

          <SectionTitle>Sample Pengecekan Kapasitas VLAN</SectionTitle>

          <StepLabel>1. Cek ip-pool</StepLabel>
          <Code>{`HUAWEI-BNG-01>display ip-pool pool-usage
-----------------------------------------------------
 Domain name        PoolLen   Used    Ratio
-----------------------------------------------------
 default0           0         0       0%
 default1           0         0       0%
 default_admin      0         0       0%
 ret10m             8192      3338    40%
 ret20m             8192      3107    37%
 ret30m             8192      0       0%
 ret50m             1024      322     31%
 ret100m            1024      39      3%
 ret5m              8192      317     3%
 ret20mvl2828       4096      0       0%
 ret20mvl2830       4096      1720    41%
 2901-africa        4096      468     11%
 2902-pakistan      4096      105     2%
 2903-india         4096      3583    87%
 2904-singapura     4096      3040    74%
 2910-zimbabwe      4096      297     7%
 2911-denmark       4096      1325    32%
 2912-italia        4096      0       0%
 2913-spanyol       4096      60      1%
 2999-test          256       0       0%
-----------------------------------------------------
 Total statistics   84224     23540   27%
-----------------------------------------------------
HUAWEI-BNG-01>`}</Code>

          <ul className="text-[11px] text-muted-foreground mt-2 space-y-1 list-disc pl-4">
            <li>
              <span className="font-semibold text-foreground">PoolLen</span> atau Pool Length adalah
              kapasitas maksimal user dalam 1 VLAN.
            </li>
            <li>
              <span className="font-semibold text-foreground">Used</span> adalah jumlah user online
              yang tergabung dalam 1 VLAN.
            </li>
            <li>
              <span className="font-semibold text-foreground">Ratio</span> adalah persentase user
              online dari jumlah maksimal dalam 1 VLAN.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
