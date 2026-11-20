import { describe, expect, it } from "vitest";
import { formatSurveillance, parseSurveillance, surveillanceDeparture } from "./surveillance";

const ACCESS_INPUT = `ANTRIAN 1
12 JAM 22 MENIT
26112100416
FTTH AKSES TANSYA SAPTA ALMEGA LINK LOSS - SERPO MUKO MUKO FAT_123 SBS-MUKO-RC-OLT-04 SN ONT 48575443

ANTRIAN 2
26112100542
FTTH AKSES YAHYA ISMAWAN PEGAWAI PLN BAD RX - SERPO SUNGAI PENUH FAT_456 SBS-PENUH-RC-OLT-01`;

const FEEDER_INPUT = `ANTRIAN 1
12 JAM 22 MENIT
26112101200
FTTH FEEDER [PROACTIVE NOC RETAIL] FAT LOSS - SPLT_TUBA015 - UNDER - SBS-LEBONG.LEBONG-MA5800-OLT-01 - SERPO ARGA MAKMUR

ANTRIAN 2
26112101251
FTTH FEEDER [PROACTIVE NOC RETAIL] OLT DOWN UNDER - SBS-ARGA.MAKMUR-RC-OLT-01 - SERPO ARGA MAKMUR`;

describe("Surveillance incident extraction", () => {
  it("extracts only customer names for FTTH AKSES and applies two-hour estimates", () => {
    const result = parseSurveillance(ACCESS_INPUT);
    expect(result.incidents.map((incident) => incident.customerName)).toEqual(["TANSYA SAPTA ALMEGA", "YAHYA ISMAWAN PEGAWAI PLN"]);
    expect(result.incidents.map((incident) => incident.incidentId)).toEqual(["26112100416", "26112100542"]);
    expect(result.incidents.map((incident) => incident.departure)).toEqual(["08:00", "10:00"]);
    expect(result.incidents.map((incident) => incident.completion)).toEqual(["2 jam", "2 jam"]);
    expect(formatSurveillance(result.incidents)).toBe(
      "Nama User : TANSYA SAPTA ALMEGA\nTim : Antrian ke - 1\nId Insiden : 26112100416\nEstimasi Berangkat (jam): 08:00\nEstimasi Penyelesaian (jam): 2 jam\n\nNama User : YAHYA ISMAWAN PEGAWAI PLN\nTim : Antrian ke - 2\nId Insiden : 26112100542\nEstimasi Berangkat (jam): 10:00\nEstimasi Penyelesaian (jam): 2 jam",
    );
  });

  it("preserves complete FEEDER descriptions and applies four-hour estimates", () => {
    const result = parseSurveillance(FEEDER_INPUT);
    expect(result.incidents.map((incident) => incident.customerName)).toEqual([
      "[PROACTIVE NOC RETAIL] FAT LOSS - SPLT_TUBA015 - UNDER - SBS-LEBONG.LEBONG-MA5800-OLT-01 - SERPO ARGA MAKMUR",
      "[PROACTIVE NOC RETAIL] OLT DOWN UNDER - SBS-ARGA.MAKMUR-RC-OLT-01 - SERPO ARGA MAKMUR",
    ]);
    expect(result.incidents.map((incident) => incident.incidentId)).toEqual(["26112101200", "26112101251"]);
    expect(result.incidents.map((incident) => incident.departure)).toEqual(["08:00", "12:00"]);
    expect(result.incidents.map((incident) => incident.completion)).toEqual(["4 jam", "4 jam"]);
  });

  it("preserves complete BACKBONE and DISTRIBUSI descriptions", () => {
    const raw = "ANTRIAN 1\n26112100668\nFTTH DISTRIBUSI GANGGUAN DISTRIBUSI - SERPO SUNGAI PENUH\nANTRIAN 2\n26112100712\nFTTH BACKBONE BACKBONE LINK DOWN - SBS-ARGA-RC-OLT-01 - SERPO ARGA MAKMUR";
    const result = parseSurveillance(raw);
    expect(result.incidents.map((incident) => incident.customerName)).toEqual([
      "GANGGUAN DISTRIBUSI - SERPO SUNGAI PENUH",
      "BACKBONE LINK DOWN - SBS-ARGA-RC-OLT-01 - SERPO ARGA MAKMUR",
    ]);
    expect(result.incidents.map((incident) => incident.departure)).toEqual(["08:00", "12:00"]);
    expect(result.incidents.map((incident) => incident.completion)).toEqual(["4 jam", "4 jam"]);
  });

  it("detects mixed categories automatically without exchanging queue IDs", () => {
    const result = parseSurveillance(`${ACCESS_INPUT}\n\n${FEEDER_INPUT.replace(/ANTRIAN 1/, "ANTRIAN 3").replace(/ANTRIAN 2/, "ANTRIAN 4")}`);
    expect(result.incidents.map((incident) => incident.category)).toEqual(["AKSES", "AKSES", "FEEDER", "FEEDER"]);
    expect(result.incidents.map((incident) => [incident.queue, incident.incidentId])).toEqual([
      [1, "26112100416"], [2, "26112100542"], [3, "26112101200"], [4, "26112101251"],
    ]);
    expect(result.incidents.map((incident) => incident.departure)).toEqual(["08:00", "10:00", "16:00", "20:00"]);
  });

  it("preserves leading zeroes and original queue numbers", () => {
    const result = parseSurveillance("ANTRIAN 4\n00012100416\nFTTH AKSES TANSYA LINK LOSS");
    expect(result.incidents[0]).toMatchObject({ queue: 4, incidentId: "00012100416", departure: "14:00" });
  });

  it("supports optional aging without including it in output", () => {
    const result = parseSurveillance("ANTRIAN 1\n26112100416\nFTTH AKSES TANSYA SAPTA ALMEGA LINK LOSS");
    expect(result.incidents[0]?.customerName).toBe("TANSYA SAPTA ALMEGA");
    expect(formatSurveillance(result.incidents)).not.toContain("JAM 22 MENIT");
  });

  it("supports independent category settings and per-queue departure overrides", () => {
    const result = parseSurveillance(`${ACCESS_INPUT}\n\n${FEEDER_INPUT.replace(/ANTRIAN 1/, "ANTRIAN 3").replace(/ANTRIAN 2/, "ANTRIAN 4")}`, {
      access: { startTime: "07:30", intervalHours: 1.5, completionHours: 3 },
      infrastructure: { startTime: "06:00", intervalHours: 5, completionHours: 5 },
      queueSettings: { 4: { departure: "09:15" } },
    });
    expect(result.incidents.map((incident) => incident.departure)).toEqual(["07:30", "09:00", "16:00", "09:15"]);
    expect(result.incidents.map((incident) => incident.completion)).toEqual(["3 jam", "3 jam", "5 jam", "5 jam"]);
    expect(surveillanceDeparture(2, "07:30", 1.5)).toBe("09:00");
  });

  it("handles same-line tabular IDs and category descriptions", () => {
    const description = "[PROACTIVE NOC RETAIL] OLT DOWN UNDER - SBS-ARGA.MAKMUR-RC-OLT-01 - SERPO ARGA MAKMUR";
    const result = parseSurveillance(`ANTRIAN 2\n21 JAM 10 MENIT\t26112101251\tFTTH FEEDER\t${description}`);
    expect(result.incidents[0]).toMatchObject({ customerName: description, incidentId: "26112101251", queue: 2 });
  });

  it("keeps multiple incidents in one queue and restarts for another team", () => {
    const result = parseSurveillance("TIM: A\nANTRIAN 1\n26112100416\nFTTH AKSES TANSYA FAT_123\n26112100542\nFTTH DISTRIBUSI YAHYA SN ONT 123\nTIM: B\nANTRIAN 1\n26112100668\nFTTH BACKBONE ANGGUN SBS-MUKO-RC-OLT-04");
    expect(result.incidents.map((incident) => [incident.queue, incident.incidentId])).toEqual([
      [1, "26112100416"], [1, "26112100542"], [1, "26112100668"],
    ]);
    expect(result.incidents.map((incident) => incident.completion)).toEqual(["2 jam", "4 jam", "4 jam"]);
  });

  it("uses one blank line between incidents", () => {
    expect(formatSurveillance(parseSurveillance(ACCESS_INPUT).incidents)).toContain("2 jam\n\nNama User : YAHYA");
  });

  it("reports incomplete rows instead of inventing incident data", () => {
    const result = parseSurveillance("ANTRIAN 1\nFTTH AKSES TANSYA LINK LOSS");
    expect(result.incidents).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(parseSurveillance("ANTRIAN 0\n26112100416\nFTTH AKSES TANSYA").incidents).toEqual([]);
  });
});
