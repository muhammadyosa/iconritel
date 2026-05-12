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

export default function BNGClearIPDocs() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* BNG Huawei NE8K */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-foreground">
            BNG Huawei NE8K
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Clear IP bertujuan untuk menghapus IP address yang didapat oleh user dari DHCP.
          </p>

          <Cmd>Command clear IP User :</Cmd>
          <CodeInline>system-view</CodeInline>
          <br />
          <CodeInline>aaa</CodeInline>
          <br />
          <CodeInline>cut access-user ip-address (IP USER)</CodeInline>
          <Code>cut access-user ip-address 10.10.75.128</Code>

          <SectionTitle>Sample Clear IP User</SectionTitle>

          <StepLabel>1. Clear IP User</StepLabel>
          <Code>{`HUAWEI-BNG-01>system-view
Enter system view, return user view with return command.
[~HUAWEI-BNG-01]aaa
[~HUAWEI-BNG-01-aaa]cut access-user ip-address 10.10.75.128
  The user has cutted off.
[~HUAWEI-BNG-01-aaa]
HUAWEI-BNG-01>`}</Code>
          <Note>
            User dengan IP <span className="font-semibold text-foreground">10.10.75.128</span>{" "}
            sudah berhasil di clear.
          </Note>
        </CardContent>
      </Card>

      {/* BNG Juniper MX104 & MX204 */}
      <Card className="bg-muted/30">
        <CardHeader className="py-2.5">
          <CardTitle className="text-center text-base font-bold tracking-wide text-foreground">
            BNG Juniper MX104 &amp; MX204
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs leading-relaxed">
          <p className="text-destructive/90 text-center text-[11px] mb-2">
            Clear IP bertujuan untuk menghapus IP address yang didapat oleh user dari DHCP.
          </p>

          <Cmd>Command clear IP User IPOE :</Cmd>
          <CodeInline>clear dhcp relay binding (IP USER)</CodeInline>
          <Code>clear dhcp relay binding 10.10.75.128</Code>

          <Cmd>Command clear IP User PPPoE :</Cmd>
          <CodeInline>clear pppoe sessions (INTERFACE PP)</CodeInline>
          <Code>clear pppoe sessions pp0.1234567890</Code>

          <SectionTitle>Sample Clear IP User</SectionTitle>

          <StepLabel>1. Clear IP User IPOE</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX104.BNG-01> clear dhcp relay binding 10.10.75.128
The user has cutted off.

permadi.nugraha@JUNIPER-MX104.BNG-01>`}</Code>
          <Note>
            User IPOE dengan IP{" "}
            <span className="font-semibold text-foreground">10.10.75.128</span> sudah berhasil di
            clear.
          </Note>

          <StepLabel>2. Clear IP User PPPoE</StepLabel>
          <Code>{`permadi.nugraha@JUNIPER-MX204.BNG-01> clear pppoe sessions pp0.1234567890
Interface pp0.1234567890 has cutted off.

permadi.nugraha@JUNIPER-MX204.BNG-01>`}</Code>
          <Note>
            User PPPoE yang terbind dengan interface{" "}
            <span className="font-semibold text-foreground">pp0.1234567890</span> sudah berhasil di
            clear.
          </Note>
        </CardContent>
      </Card>
    </div>
  );
}
