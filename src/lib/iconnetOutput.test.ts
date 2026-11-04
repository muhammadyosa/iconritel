import { describe, expect, it } from "vitest";
import { buildIconnetOutput, type IconnetOutputData } from "./iconnetOutput";

const base: IconnetOutputData = {
  resumeAllTime: "15.00",
  resumeAllDate: "2026-11-04",
  sumselAll: "",
  bangkaBelitungAll: "",
  bengkuluAll: "",
  jambiAll: "",
  lampungAll: "",
  posisiNocRitel: "",
  posisiTiketOutbond: "",
  totalTiket: "",
  resumeGangguanTime: "15.00",
  retailSbsHari: "",
  resumeGangguanDate: "2026-11-04",
  totalGangguan: "",
  sumselGangguan: "",
  bangkaBelitungGangguan: "",
  bengkuluGangguan: "",
  jambiGangguan: "",
  lampungGangguan: "",
};

const expectedEmpty = [
  "*All Ticket Open Incident Pukul 15.00*",
  "Gangguan Retail SBS Tanggal 4/11/2026",
  "",
  "Dengan Penyebaran :",
  "* Sumsel = -",
  "* Bangka Belitung = -",
  "* Bengkulu = -",
  "* Jambi = -",
  "* Lampung = -",
  "",
  "Posisi NOC Ritel SBU = -",
  "Posisi Tiket Outbond, Back Office, NOC Pusat, CM Ritel Dll = -",
  "Total Tiket = -",
  "",
  "=================================",
  "*Ticket Gangguan Over SLA Pukul 15.00*",
  "*Retail SBS = - Hari*",
  "Gangguan Retail SBS Tanggal 4/11/2026",
  "Total gangguan = -",
  "",
  "Dengan Penyebaran : ",
  "* Sumsel = -",
  "* Bangka Belitung = -",
  "* Bengkulu = -",
  "* Jambi = -",
  "* Lampung = -",
].join("\n");

describe("Iconnet preview output format", () => {
  it("matches the requested layout exactly", () => {
    expect(buildIconnetOutput(base)).toBe(expectedEmpty);
  });

  it("uses the requested headings with literal asterisks", () => {
    const out = buildIconnetOutput(base);
    expect(out).toContain("*All Ticket Open Incident Pukul 15.00*");
    expect(out).toContain("*Ticket Gangguan Over SLA Pukul 15.00*");
    expect(out).not.toContain("Ticket Open Incident All pukul");
  });

  it("wraps the Retail SBS day line in asterisks with capital Hari", () => {
    expect(buildIconnetOutput(base)).toContain("*Retail SBS = - Hari*");
    expect(buildIconnetOutput({ ...base, retailSbsHari: "2" })).toContain("*Retail SBS = 2 Hari*");
  });

  it("writes the outbond position line with the requested capitalization", () => {
    expect(buildIconnetOutput(base)).toContain(
      "Posisi Tiket Outbond, Back Office, NOC Pusat, CM Ritel Dll = -",
    );
  });

  it("keeps dates as D/M/YYYY without leading zeros and filled values", () => {
    const out = buildIconnetOutput({
      ...base,
      resumeAllDate: "2026-11-04",
      sumselAll: "5",
      totalTiket: "12",
      totalGangguan: "3",
      sumselGangguan: "3",
    });
    expect(out).toContain("Gangguan Retail SBS Tanggal 4/11/2026");
    expect(out).toContain("* Sumsel = 5");
    expect(out).toContain("Total Tiket = 12");
    expect(out).toContain("Total gangguan = 3");
  });
});
