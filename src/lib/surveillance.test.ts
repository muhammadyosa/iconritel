import { describe, expect, it } from "vitest";
import { formatSurveillance, parseSurveillance, surveillanceDeparture } from "./surveillance";

describe("Surveillance incident extraction", () => {
  const names = ["TANSYA SAPTA ALMEGA", "YAHYA ISMAWAN PEGAWAI PLN", "ANGGUN KHARISMA", "WAHYUDI"];
  const ids = ["26112100416", "26112100542", "26112100668", "26112100712"];
  const raw = names.map((name, index) => `*ANTRIAN ${index + 1}*\n21 JAM 10 MENIT\n${ids[index]}\nFTTH AKSES\t${name} LINK LOSS - SERPO MUKO MUKO FAT_123 SBS-MUKO-RC-OLT-04 SN ONT 48575443`).join("\n\n");
  it("extracts customer names without aging or technical details", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.customerName)).toEqual(names);
  });
  it("preserves each original incident ID", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.incidentId)).toEqual(ids);
    expect(parseSurveillance("ANTRIAN 1\n00012100416\nFTTH AKSES TANSYA LINK LOSS").incidents[0]?.incidentId).toBe("00012100416");
  });
  it("keeps the source queue number", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.queue)).toEqual([1, 2, 3, 4]);
    expect(parseSurveillance("ANTRIAN 4\n26112100712\nFTTH AKSES WAHYUDI BAD RX").incidents[0]?.queue).toBe(4);
  });
  it("starts at 08:00 and increases by two hours", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.departure)).toEqual(["08:00", "10:00", "12:00", "14:00"]);
    expect(surveillanceDeparture(5)).toBe("16:00");
    expect(surveillanceDeparture(9)).toBe("00:00");
  });
  it("defaults every completion estimate to two hours", () => {
    expect(parseSurveillance(raw).incidents.map((incident) => incident.completion)).toEqual(["2 jam", "2 jam", "2 jam", "2 jam"]);
  });
  it("handles same-line tabular IDs and canonical technical separators", () => {
    const result = parseSurveillance("ANTRIAN 2\n21 JAM 10 MENIT\t26112100542\tFTTH AKSES\tYAHYA ISMAWAN PEGAWAI PLN // LINK LOSS - SERPO X // FAT_123 // OLT");
    expect(result.incidents[0]).toMatchObject({ customerName: names[1], incidentId: ids[1], queue: 2 });
  });
  it("keeps multiple incidents in one queue and restarts for another team", () => {
    const result = parseSurveillance("TIM: A\nANTRIAN 1\n26112100416\nFTTH AKSES TANSYA FAT_123\n26112100542\nFTTH AKSES YAHYA SN ONT 123\nTIM: B\nANTRIAN 1\n26112100668\nFTTH AKSES ANGGUN SBS-MUKO-RC-OLT-04");
    expect(result.incidents.map((incident) => incident.queue)).toEqual([1, 1, 1]);
    expect(result.incidents.map((incident) => incident.customerName)).toEqual(["TANSYA", "YAHYA", "ANGGUN"]);
  });
  it("reports incomplete rows instead of inventing incident data", () => {
    const result = parseSurveillance("ANTRIAN 1\nFTTH AKSES TANSYA LINK LOSS");
    expect(result.incidents).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(parseSurveillance("ANTRIAN 0\n26112100416\nFTTH AKSES TANSYA").incidents).toEqual([]);
  });
});