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

const INTRO = "Telnet via UPE digunakan apabila OLT tidak bisa di telnet langsung dari tacacs, dengan catatan OLT nya terpantau up dan tidak unmonit.";

export default function TelnetOLTDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* UPE Cisco */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">UPE Cisco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">{INTRO}</p>
          <Cmd>Command untuk cek VRF :</Cmd>
          <CodeInline>show vrf</CodeInline>
          <Cmd>Command untuk telnet :</Cmd>
          <CodeInline>telnet (IP OLT) /vrf (NAMA-VRF)</CodeInline>
          <Code>{`telnet 172.0.1.1 /vrf WAN-NMS-RETAIL`}</Code>

          <SectionTitle>Sample Telnet Dari UPE Cisco</SectionTitle>

          <p className="font-semibold mt-2">1. Cek list VRF</p>
          <Code>{`CISCO-UPE-01#show vrf
  Name                    Default RD          Protocols   Interfaces
  WAN-NMS-MS              65000:71507         ipv4        BD1132
  WAN-NMS-RETAIL          65000:72122         ipv4        BD1134
CISCO-UPE-01#`}</Code>

          <p className="font-semibold mt-2">
            2. Telnet menggunakan VRF yang dipakai, sample di sini kita telnet IP <b>172.10.1.1</b> menggunakan VRF <b>WAN-NMS-RETAIL</b>
          </p>
          <Code>{`CISCO-UPE-01#telnet 172.10.1.1 /vrf WAN-NMS-RETAIL
Trying 172.10.1.1 ... Open

Warning: Telnet is not a secure protocol, and it is recommended to use Stelnet.

>>User name:root`}</Code>
        </CardContent>
      </Card>

      {/* UPE Huawei */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">UPE Huawei</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">{INTRO}</p>
          <Cmd>Command untuk cek vpn instance :</Cmd>
          <CodeInline>display ip vpn-instance</CodeInline>
          <Cmd>Command untuk telnet :</Cmd>
          <CodeInline>telnet vpn-instance (NAMA-VRF) (IP OLT)</CodeInline>
          <Code>{`telnet vpn-instance WAN-NMS-RETAIL 172.10.1.1`}</Code>

          <SectionTitle>Sample Telnet Dari UPE Huawei</SectionTitle>

          <p className="font-semibold mt-2">1. Cek list vpn instance</p>
          <Code>{`HUAWEI-UPE-01>display ip vpn-instance
  Total VPN-Instances configured       : 3
  Total IPv4 VPN-Instances configured  : 3
  Total IPv6 VPN-Instances configured  : 1

  VPN-Instance Name           RD              Address-family
  WAN-NMS-RETAIL              65000:72122     IPv4
  __LOCAL_OAM_VPN__                           IPv4
  __LOCAL_OAM_VPN__                           IPv6
  __dcn_vpn__                                 IPv4
HUAWEI-UPE-01>`}</Code>

          <p className="font-semibold mt-2">
            2. Telnet menggunakan VRF yang dipakai, sample di sini kita telnet IP <b>172.10.1.1</b> menggunakan VRF <b>WAN-NMS-RETAIL</b>
          </p>
          <Code>{`HUAWEI-UPE-01>telnet vpn-instance WAN-NMS-RETAIL 172.10.1.1
  Trying 172.10.1.1 ...
  Press CTRL+K to abort
  Connected to 172.10.1.1 ...
Warning: Telnet is not a secure protocol, and it is recommended to use Stelnet.

>>User name:root
>>User password:


    Huawei Integrated Access Software (MA5801).
    Copyright(C) Huawei Technologies Co., Ltd. 2002-2022. All rights reserved.

-----------------------------------------------------------------------------
User last login information:
-----------------------------------------------------------------------------
Access Type   : Telnet
IP-Address    : 10.14.4.5
Login Time    : 2023-03-20 06:58:57+07:00
Logout Time   : 2023-03-20 06:59:06+07:00
-----------------------------------------------------------------------------
-----------------------------------------------------------------------------
All user fail login information:
-----------------------------------------------------------------------------
Access Type   IP-Address       Time                       Login Times
-----------------------------------------------------------------------------
Telnet        10.14.4.5        2023-03-19 11:34:59+07:00  2
-----------------------------------------------------------------------------

HUAWEI-OLT-01>`}</Code>
        </CardContent>
      </Card>

      {/* UPE Juniper */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">UPE Juniper</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed">
          <p className="text-destructive/90 font-medium text-center">{INTRO}</p>
          <Cmd>Command untuk cek routing instance :</Cmd>
          <CodeInline>show route instance</CodeInline>
          <Cmd>Command untuk telnet :</Cmd>
          <CodeInline>telnet routing-instance (NAMA-VRF) (IP OLT)</CodeInline>
          <Code>{`telnet routing-instance WAN-NMS-RETAIL 172.10.1.1`}</Code>

          <SectionTitle>Sample Telnet Dari UPE Juniper</SectionTitle>

          <p className="font-semibold mt-2">1. Cek list routing instance</p>
          <Code>{`tegar.dwi@JUNIPER-UPE-01> show route instance
Instance                Type
        Primary RIB                     Active/holddown/hidden
master                  forwarding
WAN-NMS-RETAIL          vrf
        WAN-NMS-RETAIL.inet.0           40/0/0`}</Code>

          <p className="font-semibold mt-2">
            2. Telnet menggunakan VRF yang dipakai, sample di sini kita telnet IP <b>172.10.1.1</b> menggunakan VRF <b>WAN-NMS-RETAIL</b>
          </p>
          <Code>{`tegar.dwi@JUNIPER-UPE-01> telnet routing-instance WAN-NMS-RETAIL 172.10.1.1
Trying 172.10.1.1...
Connected to 172.10.1.1.
Escape character is '^]'.

Warning: Telnet is not a secure protocol, and it is recommended to use Stelnet.

>>User name:root
>>User password:


    Huawei Integrated Access Software (MA5801).
    Copyright(C) Huawei Technologies Co., Ltd. 2002-2022. All rights reserved.

-----------------------------------------------------------------------------
All user fail login information:
-----------------------------------------------------------------------------
Access Type   IP-Address       Time                       Login Times
-----------------------------------------------------------------------------
Telnet        10.14.4.5        2023-03-31 07:40:40+07:00  2
-----------------------------------------------------------------------------

HUAWEI-OLT-01>`}</Code>
        </CardContent>
      </Card>
    </div>
  );
}
