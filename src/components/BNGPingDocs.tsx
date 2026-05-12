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

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground italic mt-1">{children}</p>;
}

export default function BNGPingDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* BNG Huawei NE8K */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-white">
            BNG Huawei NE8K
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Pengetesan PING ini dilakukan untuk mengecek koneksi antara BNG dengan user yang sedang
            kita tes.
          </p>

          <Cmd>Command mencari IP Gateway :</Cmd>
          <CodeInline>display current-configuration | section include ip pool</CodeInline>

          <Cmd>Command PING dari gateway ke tujuan :</Cmd>
          <CodeInline>ping -a (IP GATEWAY) (IP TUJUAN)</CodeInline>
          <Code>ping -a 10.10.64.1 10.10.75.128</Code>

          <Cmd>Command PING dari gateway ke google :</Cmd>
          <CodeInline>ping -a (IP GATEWAY) (IP GOOGLE)</CodeInline>
          <Code>ping -a 10.10.64.1 8.8.8.8</Code>

          <Cmd>Command PING 100x :</Cmd>
          <CodeInline>ping -brief -m 5 -c 100 (IP TUJUAN)</CodeInline>
          <Code>ping -b -m 5 -c 100 10.10.75.128</Code>

          <Note>IP Tujuan di atas bisa diganti menjadi IP ONT yang ingin kita tuju.</Note>

          <SectionTitle>Sample Pengetesan PING</SectionTitle>

          <StepLabel>
            1. Mencari IP gateway terlebih dahulu, sample di sini kita akan mengetes ping user yang
            ada di VLAN 2910.
          </StepLabel>
          <Code>{`HUAWEI-BNG-01>display current-configuration | section include ip pool
Info: It will take a long time if the content you search is too much or the string you input is too long, you can press CTRL_C to break.
#
ip pool 2901-africa bas remote
 gateway 10.10.0.1 255.255.240.0
 dhcp-server group bng_huawei
#
ip pool 2902-pakistan bas remote
 gateway 10.10.16.1 255.255.240.0
 dhcp-server group bng_huawei
#
ip pool 2903-india bas remote
 gateway 10.10.32.1 255.255.240.0
 dhcp-server group bng_huawei
#
ip pool 2904-singapura bas remote
 gateway 10.10.48.1 255.255.240.0
 dhcp-server group bng_huawei
#
ip pool 2910-zimbabwe bas remote
 gateway 10.10.64.1 255.255.240.0
 dhcp-server group bng_huawei
#
ip pool 2911-denmark bas remote
 gateway 10.10.80.1 255.255.240.0
 dhcp-server group bng_huawei
#
ip pool 2912-italia bas remote
 gateway 10.10.96.1 255.255.240.0
 dhcp-server group bng_huawei
HUAWEI-BNG-01>`}</Code>
          <Note>
            Bisa dilihat baris <span className="font-semibold text-foreground">10.10.64.1</span>{" "}
            adalah IP Gateway untuk VLAN 2910.
          </Note>

          <StepLabel>2. Test PING dengan tujuan IP ONT nya 10.10.75.128</StepLabel>
          <Code>{`HUAWEI-BNG-01>ping -a 10.10.64.1 10.10.75.128
Warning: The specified source address is not a local address, the ping command will not check the network connection.
PING 10.10.75.128: 56 data bytes, press CTRL_C to break
  Reply from 10.10.75.128: bytes=56 Sequence=1 ttl=64 time=4 ms
  Reply from 10.10.75.128: bytes=56 Sequence=2 ttl=64 time=4 ms
  Reply from 10.10.75.128: bytes=56 Sequence=3 ttl=64 time=5 ms
  Reply from 10.10.75.128: bytes=56 Sequence=4 ttl=64 time=5 ms
  Reply from 10.10.75.128: bytes=56 Sequence=5 ttl=64 time=4 ms

--- 10.10.75.128 ping statistics ---
  5 packet(s) transmitted
  5 packet(s) received
  0.00% packet loss
  round-trip min/avg/max = 4/4/5 ms
HUAWEI-BNG-01>`}</Code>
          <Note>
            Pengetesan menunjukan hasil Reply yang berarti user tersebut terhubung dengan BNG,
            apabila muncul hasil Request Time Out ada kemungkinan koneksi ke arah IP tujuan
            bermasalah, atau memang IP tujuan belum di allow untuk akses PING.
          </Note>
          <Note>Note: IP 10.10.64.1 adalah IP Gateway yang sudah kita cari di atas.</Note>

          <StepLabel>3. Test PING dengan tujuan IP Google (8.8.8.8).</StepLabel>
          <Code>{`HUAWEI-BNG-01>ping -a 10.10.64.1 8.8.8.8
Warning: The specified source address is not a local address, the ping command will not check the network connection.
PING 8.8.8.8: 56 data bytes, press CTRL_C to break
  Reply from 8.8.8.8: bytes=56 Sequence=1 ttl=64 time=4 ms
  Reply from 8.8.8.8: bytes=56 Sequence=2 ttl=64 time=4 ms
  Reply from 8.8.8.8: bytes=56 Sequence=3 ttl=64 time=5 ms
  Reply from 8.8.8.8: bytes=56 Sequence=4 ttl=64 time=5 ms
  Reply from 8.8.8.8: bytes=56 Sequence=5 ttl=64 time=4 ms

--- 8.8.8.8 ping statistics ---
  5 packet(s) transmitted
  5 packet(s) received
  0.00% packet loss
  round-trip min/avg/max = 4/4/5 ms
HUAWEI-BNG-01>`}</Code>
          <Note>
            Pengetesan menunjukan hasil Reply yang berarti IP Gateway sudah reachable ke Google,
            jika muncul Request Time Out atau Destination Host Unreachable berarti ada kendala dan
            tidak dapat terhubung ke Google.
          </Note>

          <StepLabel>4. Test PING brutal 100x.</StepLabel>
          <Code>{`HUAWEI-BNG-01>ping -brief -m 5 -c 100 10.10.75.128
PING 10.10.75.128: 56 data bytes, press CTRL_C to break
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!

--- 10.10.75.128 ping statistics ---
  100 packet(s) transmitted
  100 packet(s) received
  0.00% packet loss
  round-trip min/avg/max = 4/4/15 ms

HUAWEI-BNG-01>`}</Code>
          <Note>
            Hasil "!" berarti reply, "." berarti Request Time Out, mix keduanya artinya
            intermittent (koneksi tidak stabil) — bisa karena traffic penuh, redaman terlalu
            tinggi, atau bad device.
          </Note>
          <Note>Jumlah ping bisa diubah antara 1 - 4294967295.</Note>
        </CardContent>
      </Card>

      {/* BNG Juniper MX204 */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-white">
            BNG Juniper MX204
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Pengetesan PING ini dilakukan untuk mengecek koneksi antara BNG dengan user yang sedang
            kita tes.
          </p>

          <Cmd>Command mencari IP Gateway :</Cmd>
          <CodeInline>show configuration | find pool</CodeInline>

          <Cmd>Command PING dari gateway ke tujuan :</Cmd>
          <CodeInline>ping source (IP GATEWAY) (IP TUJUAN)</CodeInline>
          <Code>ping source 10.10.64.1 10.10.75.128</Code>

          <Cmd>Command PING dari gateway ke google :</Cmd>
          <CodeInline>ping source (IP GATEWAY) (IP GOOGLE)</CodeInline>
          <Code>ping source 10.10.64.1 8.8.8.8</Code>

          <Cmd>Command PING 100x :</Cmd>
          <CodeInline>ping rapid count 100 (IP TUJUAN)</CodeInline>
          <Code>ping rapid count 100 10.10.75.128</Code>

          <Note>IP Tujuan di atas bisa diganti menjadi IP ONT yang ingin kita tuju.</Note>

          <SectionTitle>Sample Pengecekan IP User</SectionTitle>

          <StepLabel>
            1. Mencari IP gateway terlebih dahulu, sample di sini kita akan mengetes ping user yang
            ada di VLAN 2910.
          </StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> show configuration | find pool
pool ZIMBABWE {
    family inet {
        network 10.10.64.0/20;
        range POOL_ZIMBABWE {
            low 10.10.64.10;
            high 10.10.79.250;
        }
        dhcp-attributes {
            maximum-lease-time 604800;
            server-identifier 10.10.64.1;
            router { 10.10.64.1;
        }
permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>
          <Note>
            Bisa dilihat bagian{" "}
            <span className="font-semibold text-foreground">router 10.10.64.1</span> adalah IP
            Gateway untuk VLAN 2910.
          </Note>

          <StepLabel>2. Test PING dengan tujuan IP ONT nya 10.10.75.128</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> ping source 10.10.64.1 10.10.75.128
PING 10.10.75.128 (10.141.145.29): 56 data bytes
64 bytes from 10.10.75.128: icmp_seq=1 ttl=64 time=3.421 ms
64 bytes from 10.10.75.128: icmp_seq=2 ttl=64 time=6.899 ms
64 bytes from 10.10.75.128: icmp_seq=3 ttl=64 time=4.393 ms
64 bytes from 10.10.75.128: icmp_seq=4 ttl=64 time=6.560 ms

^C --- 10.10.75.128 ping statistics ---
5 packets transmitted, 4 packets received, 20% packet loss
round-trip min/avg/max/stddev = 3.421/5.318/6.899/1.457 ms

permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>
          <Note>
            Pengetesan menunjukan hasil Reply yang berarti user tersebut terhubung dengan BNG,
            apabila muncul Request Time Out ada kemungkinan koneksi ke arah IP tujuan bermasalah,
            atau memang IP tujuan belum di allow untuk akses PING.
          </Note>
          <Note>Note: IP 10.10.64.1 adalah IP Gateway yang sudah kita cari di atas.</Note>

          <StepLabel>3. Test PING dengan tujuan IP Google (8.8.8.8).</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> ping source 10.10.64.1 8.8.8.8
PING 8.8.8.8 (8.8.8.8): 56 data bytes
64 bytes from 8.8.8.8: icmp_seq=0 ttl=119 time=28.309 ms
64 bytes from 8.8.8.8: icmp_seq=1 ttl=119 time=28.457 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=119 time=28.993 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=119 time=27.871 ms
^C
--- 8.8.8.8 ping statistics ---
4 packets transmitted, 4 packets received, 0% packet loss
round-trip min/avg/max/stddev = 27.871/28.407/28.993/0.401 ms

permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>
          <Note>
            Pengetesan menunjukan hasil Reply yang berarti IP Gateway sudah reachable ke Google,
            jika muncul Request Time Out atau Destination Host Unreachable berarti ada kendala dan
            tidak dapat terhubung ke Google.
          </Note>

          <StepLabel>4. Test PING brutal 100x.</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> ping rapid count 100 10.10.75.128
PING 10.10.75.128 (10.10.75.128): 56 data bytes
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!
--- 10.10.75.128 ping statistics ---
100 packets transmitted, 100 packets received, 0% packet loss
round-trip min/avg/max/stddev = 3.543/6.234/15.848/2.051 ms

permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>
          <Note>
            Hasil "!" berarti reply, "." berarti Request Time Out, mix keduanya artinya
            intermittent (koneksi tidak stabil) — bisa karena traffic penuh, redaman terlalu
            tinggi, atau bad device.
          </Note>
          <Note>Jumlah ping bisa diubah antara 1 - 2000000000.</Note>
        </CardContent>
      </Card>

      {/* BNG Juniper MX104 */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-white">
            BNG Juniper MX104
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Pengetesan PING di Juniper MX104 bisa dilakukan di MX204 juga, karena untuk command
            hampir mirip, yang membedakan MX104 kebanyakan masih dipakai untuk IPOE, jadi tidak
            perlu find pool.
          </p>

          <Cmd>Command PING dari gateway ke tujuan :</Cmd>
          <CodeInline>ping (IP TUJUAN)</CodeInline>
          <Code>ping 10.10.75.128</Code>

          <Cmd>Command PING dari gateway ke google :</Cmd>
          <CodeInline>ping (IP GOOGLE)</CodeInline>
          <Code>ping 8.8.8.8</Code>

          <Cmd>Command PING 100x :</Cmd>
          <CodeInline>ping rapid count 100 (IP TUJUAN)</CodeInline>
          <Code>ping rapid count 100 10.10.75.128</Code>

          <Note>IP Tujuan di atas bisa diganti menjadi IP ONT yang ingin kita tuju.</Note>

          <SectionTitle>Sample Pengecekan IP User</SectionTitle>

          <StepLabel>1. Test PING dengan tujuan IP ONT nya 10.10.75.128</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX104.BNG-01> ping 10.10.75.128
PING 10.10.75.128 (10.10.75.128): 56 data bytes
64 bytes from 10.10.75.128: icmp_seq=0 ttl=64 time=21.390 ms
64 bytes from 10.10.75.128: icmp_seq=1 ttl=64 time=20.615 ms
64 bytes from 10.10.75.128: icmp_seq=2 ttl=64 time=14.673 ms
64 bytes from 10.10.75.128: icmp_seq=3 ttl=64 time=26.208 ms
^C
--- 10.10.75.128 ping statistics ---
4 packets transmitted, 4 packets received, 0% packet loss
round-trip min/avg/max/stddev = 14.673/20.721/26.208/4.097 ms

{master}
permadi.nugraha@JUNIPER-MX104.BNG-01>`}</Code>
          <Note>
            Pengetesan menunjukan hasil Reply yang berarti user tersebut terhubung dengan BNG,
            apabila muncul Request Time Out ada kemungkinan koneksi ke arah IP tujuan bermasalah,
            atau memang IP tujuan belum di allow untuk akses PING.
          </Note>

          <StepLabel>2. Test PING dengan tujuan IP Google (8.8.8.8).</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX104.BNG-01> ping 8.8.8.8
PING 8.8.8.8 (8.8.8.8): 56 data bytes
64 bytes from 8.8.8.8: icmp_seq=0 ttl=59 time=18.725 ms
64 bytes from 8.8.8.8: icmp_seq=1 ttl=59 time=22.961 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=59 time=20.162 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=59 time=21.540 ms
^C
--- 8.8.8.8 ping statistics ---
4 packets transmitted, 4 packets received, 0% packet loss
round-trip min/avg/max/stddev = 18.725/20.847/22.961/1.575 ms

{master}
permadi.nugraha@JUNIPER-MX104.BNG-01>`}</Code>
          <Note>
            Pengetesan menunjukan hasil Reply yang berarti IP Gateway sudah reachable ke Google,
            jika muncul Request Time Out atau Destination Host Unreachable berarti ada kendala dan
            tidak dapat terhubung ke Google.
          </Note>

          <StepLabel>3. Test PING brutal 100x.</StepLabel>
          <Code>{`permadi.nugraha@SBU-TITIKUNING-MX104.BNG-CPE-01-RE0> ping rapid count 100 10.10.75.128
PING 10.10.75.128 (10.10.75.128): 56 data bytes
!!.!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!.!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--- 10.10.75.128 ping statistics ---
100 packets transmitted, 98 packets received, 2% packet loss
round-trip min/avg/max/stddev = 13.330/14.645/27.335/1.763 ms

{master}
permadi.nugraha@SBU-TITIKUNING-MX104.BNG-CPE-01-RE0>`}</Code>
          <Note>
            Hasil "!" berarti reply, "." berarti Request Time Out, mix keduanya artinya
            intermittent (koneksi tidak stabil) — bisa karena traffic penuh, redaman terlalu
            tinggi, atau bad device.
          </Note>
          <Note>Jumlah ping bisa diubah antara 1 - 2000000000.</Note>
        </CardContent>
      </Card>
    </div>
  );
}
