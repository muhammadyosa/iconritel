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

const INTRO = "Cara ini dipakai apabila kita ingin mencari OLT yang kita tuju terkoneksi ke UPE mana.";

export default function SearchInterkoneksiDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Mencari Interkoneksi OLT > UPE */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">Mencari Interkoneksi OLT &gt; UPE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">{INTRO}</p>

          <Cmd>Perangkat UPE DCN :</Cmd>
          <p className="text-xs font-bold">192.168.23.126</p>
          <p className="text-xs font-bold">JKT-GANDUL.DCN-R3845-UPE-03</p>

          <Cmd>Command untuk cek ip routing semua VRF :</Cmd>
          <CodeInline>show ip route vrf * (IP OLT)</CodeInline>
          <Code>{`show ip route vrf * 172.10.1.1`}</Code>

          <Cmd>Command untuk cek ip routing spesifik VRF :</Cmd>
          <CodeInline>show ip route vrf WAN_NMS_IP (IP OLT)</CodeInline>
          <Code>{`show ip route vrf WAN_NMS_IP 172.10.1.1`}</Code>

          <SectionTitle>Sample Mencari Interkoneksi OLT dengan IP 172.10.1.1</SectionTitle>

          <p className="font-semibold mt-2">1. Cek melalui VRF yang lebih spesifik</p>
          <Code>{`JKT-GANDUL.DCN-R3845-UPE-03#show ip route vrf WAN_NMS_IP 172.10.1.1

Routing Table: WAN_NMS_IP
Routing entry for 172.10.1.1/29
  Known via "bgp 65000", distance 200, metric 0, type internal
  Last update from 192.168.1.1 3w4d ago
  Routing Descriptor Blocks:
  * 192.168.1.1 (default), from 192.168.84.254, 3w4d ago
      Route metric is 0, traffic share count is 1
      AS Hops 0
      MPLS label: 50773
      MPLS Flags: MPLS Required

JKT-GANDUL.DCN-R3845-UPE-03#`}</Code>

          <Note>
            Bisa dilihat IP yang berwarna hijau (<b className="text-emerald-500 not-italic">192.168.1.1</b>) adalah IP dari UPE yang terhubung dengan OLT yang sedang kita cari, kita bisa langsung telnet IP tersebut melalui tacacs.
          </Note>
        </CardContent>
      </Card>

      {/* Lanjutan #2 */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">Lanjutan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">{INTRO}</p>

          <p className="font-semibold mt-2">2. Cek melalui keseluruhan VRF</p>
          <Code>{`JKT-GANDUL.DCN-R3845-UPE-03#show ip route vrf * 172.10.1.1

Routing entry for 172.0.0.0/12, supernet
  Known via "ospf 100", distance 110, metric 0, type extern 2, forward metric 24
  Last update from 172.7.1.1 on GigabitEthernet0/0, 7w0d ago
  Routing Descriptor Blocks:
  * 172.7.1.1, from 192.168.1.254, 7w0d ago, via GigabitEthernet0/0
      Route metric is 0, traffic share count is 1

Routing Table: INTERNET-CORPORATE
% Network not in table

Routing Table: VPN-DRC-ICON
% Network not in table

Routing Table: VPN_NMS_V5P
% Network not in table

Routing Table: VPN_WAN_NMS_RAD
% Network not in table

Routing Table: WAN-ALFAMART-STORE
% Network not in table

Routing Table: WAN-DCN-MIKROTIK
% Network not in table

Routing Table: WAN-ICON-RADIUS
% Network not in table

Routing Table: WAN-MONITORING-SBC
% Network not in table

Routing Table: WAN-NMS-CLIENT
% Network not in table

Routing Table: WAN-NMS-DCN-RAISECOM
% Network not in table

Routing Table: WAN-NMS-DCN-TRANSITION
% Network not in table

Routing Table: WAN-NMS-EDD-RAD
% Network not in table

Routing Table: WAN-NMS-GPON-WRI
% Network not in table

Routing Table: WAN-NMS-HARIFF
% Network not in table

Routing Table: WAN-NMS-IA5000-HUAWEI
% Network not in table

Routing Table: WAN-NMS-SOPHO
% Network not in table

Routing Table: WAN-NMS-TELICON
% Network not in table

Routing Table: WAN-RADIUS-SERVER
% Network not in table

Routing Table: WAN-VOIP-POP
% Network not in table

Routing Table: WAN_NMS_IP
Routing entry for 172.10.1.1/29
  Known via "bgp 65000", distance 200, metric 0, type internal
  Last update from 192.168.1.1 3w4d ago
  Routing Descriptor Blocks:
  * 192.168.1.1 (default), from 192.168.84.254, 3w4d ago
      Route metric is 0, traffic share count is 1
      AS Hops 0
      MPLS label: 50773
      MPLS Flags: MPLS Required

Routing Table: VOIP-UBM
% Network not in table

Routing Table: SERVER-VICON-UBM-VIA-DCN
% Network not in table

Routing Table: WAN-NMS-DWDM-FIBERHOME
% Subnet not in table

JKT-GANDUL.DCN-R3845-UPE-03#`}</Code>

          <Note>
            Kurang lebih tetap sama kita berpatokan di VRF WAN_NMS_IP, tapi cara ini bisa digunakan ketika kalian terbiasa mengetik dan tidak perlu ribet menuliskan nama VRF nya. Bisa dilihat IP yang berwarna hijau (<b className="text-emerald-500 not-italic">192.168.1.1</b>) adalah IP dari UPE yang terhubung dengan OLT yang sedang kita cari, kita bisa langsung telnet IP tersebut melalui tacacs.
          </Note>
        </CardContent>
      </Card>

      {/* Lanjutan #3 */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">Lanjutan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">{INTRO}</p>

          <p className="font-semibold mt-2">
            3. Telnet dan cek hasil IP UPE yang berwarna <span className="text-emerald-500">hijau</span> yang di temukan sebelumnya
          </p>
          <Code>{`[tegar.dwi@ terminal ~]# t 192.168.1.1
Trying 192.168.1.1...
Connected to 192.168.1.1.
Escape character is '^]'.

Warning: Telnet is not a secure protocol, and it is recommended to use Stelnet.

Username:tegar.dwi
Password:

Info: The max number of VTY users is 21,
the number of current VTY users online is 1,
and total number of terminal users online is 1.
The current login time is 2023-04-08 21:00:22+07:00.
Warning: The password of the root account is the default password. Please change the password.
HUAWEI-UPE-01>`}</Code>

          <Note>Kita sudah masuk ke UPE yang dituju :D</Note>
        </CardContent>
      </Card>
    </div>
  );
}
