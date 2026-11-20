import { describe, expect, it } from "vitest";
import { formatSurveillance, parseSurveillance, surveillanceDeparture } from "./surveillance";

const PROACTIVE_DESCRIPTION = "[PROACTIVE NOC RETAIL] FAT LOSS - SPLT_TUBA015 - UNDER - SBS-LEBONG.LEBONG-MA5800-OLT-01 - SERPO ARGA MAKMUR";

describe("Surveillance incident extraction", () => {
  const descriptions = [
    PROACTIVE_DESCRIPTION,
    "[PROACTIVE NOC RETAIL] OLT BAD RX SEGMEN - SBS-MUKO.MUKO-RC-OLT-04 - TO - SBS-PONDOK.SUGUH-NE8000-UPE-01 - SERPO MUKO MUKO",
    "GANGGUAN DISTRIBUSI - SERPO SUNGAI PENUH",
    "BACKBONE LINK DOWN - SERPO ARGA MAKMUR",
  ];
  const categories = ["FTTH AKSES", "FTTH FEEDER", "FTTH DISTRIBUSI", "FTTH BACKBONE"] as const;
  const ids = ["26112101200", "26112100542", "26112100668", "26112100712"];
  const raw = descriptions.map((description, index) => `ANTRIAN ${index + 1}\n21 JAM 10 MENIT\n${ids[index]}\n${categories[index]}\t${description}`).join("\n\n");

  it("preserves the complete description for every supported FTTH category", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.customerName)).toEqual(descriptions);
  });

  it("preserves each original incident ID and its queue association", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.incidentId)).toEqual(ids);
    expect(parseSurveillance(raw).incidents.map((incident) => incident.queue)).toEqual([1, 2, 3, 4]);
    expect(parseSurveillance("ANTRIAN 1\n00012100416\nFTTH AKSES TANSYA LINK LOSS").incidents[0]?.incidentId).toBe("00012100416");
  });

  it("ignores optional aging lines and supports tickets without aging", () => {
    const result = parseSurveillance("ANTRIAN 4\n26112100712\nFTTH AKSES [PROACTIVE NOC RETAIL] FAT LOSS - SERPO ARGA MAKMUR");
    expect(result.incidents[0]).toMatchObject({ queue: 4, incidentId: "26112100712" });
    expect(result.incidents[0]?.customerName).not.toContain("21 JAM");
  });

  it("starts at 08:00 and increases by two hours by default", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.departure)).toEqual(["08:00", "10:00", "12:00", "14:00"]);
    expect(surveillanceDeparture(5)).toBe("16:00");
    expect(surveillanceDeparture(9)).toBe("00:00");
  });

  it("defaults every completion estimate to four hours", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.completion)).toEqual(["4 jam", "4 jam", "4 jam", "4 jam"]);
  });

  it("supports custom start time, interval, completion, and per-queue overrides", () => {
    const result = parseSurveillance(raw, {
      startTime: "07:30",
      intervalHours: 1.5,
      completionHours: 5,
      queueSettings: {
        2: { departure: "09:15", completionHours: 6 },
      },
    });
    expect(result.incidents.map((incident) => incident.departure)).toEqual(["07:30", "09:15", "10:30", "12:00"]);
    expect(result.incidents.map((incident) => incident.completion)).toEqual(["5 jam", "6 jam", "5 jam", "5 jam"]);
    expect(surveillanceDeparture(2, "07:30", 1.5)).toBe("09:00");
  });

  it("handles same-line tabular IDs without truncating technical details", () => {
    const result = parseSurveillance(`ANTRIAN 2\n21 JAM 10 MENIT\t26112100542\tFTTH FEEDER\t${descriptions[1]}`);
    expect(result.incidents[0]).toMatchObject({ customerName: descriptions[1], incidentId: ids[1], queue: 2 });
  });

  it("keeps multiple incidents in one queue and restarts for another team", () => {
    const result = parseSurveillance("TIM: A\nANTRIAN 1\n26112100416\nFTTH AKSES TANSYA FAT_123\n26112100542\nFTTH DISTRIBUSI YAHYA SN ONT 123\nTIM: B\nANTRIAN 1\n26112100668\nFTTH BACKBONE ANGGUN SBS-MUKO-RC-OLT-04");
    expect(result.incidents.map((incident) => incident.queue)).toEqual([1, 1, 1]);
    expect(result.incidents.map((incident) => incident.incidentId)).toEqual(["26112100416", "26112100542", "26112100668"]);
  });

  it("formats the requested ICRM example exactly", () => {
    const result = parseSurveillance(`20/11/2026\nTIM: SERPO ARGA MAKMUR\nANTRIAN 1\n12 JAM 22 MENIT\n26112101200\nFTTH AKSES ${PROACTIVE_DESCRIPTION}`);
    expect(formatSurveillance(result.incidents)).toBe(
      `Nama User : ${PROACTIVE_DESCRIPTION}\nTim : Antrian ke - 1\nId Insiden : 26112101200\nEstimasi Berangkat (jam): 08:00\nEstimasi Penyelesaian (jam): 4 jam`,
    );
  });

  it("adds one blank line between incidents", () => {
    const result = parseSurveillance("ANTRIAN 1\n26112100416\nFTTH AKSES TANSYA LINK LOSS\nANTRIAN 2\n26112100542\nFTTH AKSES YAHYA BAD RX");
    expect(formatSurveillance(result.incidents)).toContain("4 jam\n\nNama User : YAHYA BAD RX");
  });

  it("reports incomplete rows instead of inventing incident data", () => {
    const result = parseSurveillance("ANTRIAN 1\nFTTH AKSES TANSYA LINK LOSS");
    expect(result.incidents).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(parseSurveillance("ANTRIAN 0\n26112100416\nFTTH AKSES TANSYA").incidents).toEqual([]);
  });
});
