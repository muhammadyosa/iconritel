import { describe, expect, it } from "vitest";
import { FEEDER_CONSTRAINTS_SET, generateTicketFormat, parseTrafficDetails } from "./ticket";

describe("FEEDER traffic constraints", () => {
  it("classifies OLT BAD RX SEGMEN as FEEDER and preserves its destination when editing", () => {
    expect(FEEDER_CONSTRAINTS_SET.has("OLT BAD RX SEGMEN")).toBe(true);
    const hostname = "SBS-MUKO.MUKO-RC-OLT-04";
    const serpo = "SERPO MUKO MUKO";
    const traffic = { destination: "SBS-PONDOK.SUGUH-NE8000-UPE-01", impactHostname: "", impactPort: "", linkHostname: "" };
    const result = generateTicketFormat("OLT BAD RX SEGMEN", "", serpo, "", hostname, "", undefined, false, traffic);
    expect(result).toBe("[PROAKTIF NOC RETAIL] OLT BAD RX SEGMEN - SBS-MUKO.MUKO-RC-OLT-04 - TO - SBS-PONDOK.SUGUH-NE8000-UPE-01 - SERPO MUKO MUKO");
    expect(parseTrafficDetails("OLT BAD RX SEGMEN", result, hostname, serpo)).toEqual(traffic);
  });

  it("classifies UPE BAD RX SEGMEN as FEEDER and accepts the supplied NPE destination", () => {
    expect(FEEDER_CONSTRAINTS_SET.has("UPE BAD RX SEGMEN")).toBe(true);
    const hostname = "SBS-ULP.SUNGAI.PENUH-ASR920-UPE-01";
    const serpo = "SERPO SUNGAI PENUH";
    const traffic = { destination: "SBS-BANGKO-NE8000.M14-NPE-02", impactHostname: "", impactPort: "", linkHostname: "" };
    const result = generateTicketFormat("UPE BAD RX SEGMEN", "", serpo, "", hostname, "", undefined, false, traffic);
    expect(result).toBe("[PROAKTIF NOC RETAIL] UPE BAD RX SEGMEN - SBS-ULP.SUNGAI.PENUH-ASR920-UPE-01 - TO - SBS-BANGKO-NE8000.M14-NPE-02 - SERPO SUNGAI PENUH");
    expect(parseTrafficDetails("UPE BAD RX SEGMEN", result, hostname, serpo)).toEqual(traffic);
  });

  it("classifies FULL TRAFFIC SEGMENT as FEEDER and matches the supplied example", () => {
    expect(FEEDER_CONSTRAINTS_SET.has("FULL TRAFFIC SEGMENT")).toBe(true);
    const hostname = "SBS-ULP.SUNGAI.PENUH-ASR920-UPE-01";
    const serpo = "SERPO SUNGAI PENUH";
    const traffic = { destination: "SBS-BANGKO-NE8000.M14-NPE-02", impactHostname: "SBT-GH.ALAHAN.PANJANG-ASR920.12SZ-UPE-02", impactPort: "TE0 0 2", linkHostname: "SBT-KP.SURIAN-NE8000.M1A-UPE-01" };
    const result = generateTicketFormat("FULL TRAFFIC SEGMENT", "", serpo, "", hostname, "", undefined, false, traffic);
    expect(result).toBe("[PROACTIVE NOC RETAIL] FULL TRAFFIC SEGMENT - SBS-ULP.SUNGAI.PENUH-ASR920-UPE-01 TO SBS-BANGKO-NE8000.M14-NPE-02 IMPACT SBT-GH.ALAHAN.PANJANG-ASR920.12SZ-UPE-02 TE0 0 2(LINK TO SBT-KP.SURIAN-NE8000.M1A-UPE-01): DOWN - SERPO SUNGAI PENUH");
    expect(parseTrafficDetails("FULL TRAFFIC SEGMENT", result, hostname, serpo)).toEqual(traffic);
  });

  it("classifies FULL TRAFFIC as FEEDER and preserves the supplied PROAKTIF format", () => {
    expect(FEEDER_CONSTRAINTS_SET.has("FULL TRAFFIC")).toBe(true);
    const hostname = "SBS-MUKO.MUKO-RC-OLT-04";
    const serpo = "SERPO MUKO-MUKO";
    const traffic = { destination: "SBS-PONDOK.SUGUH-NE8000-UPE-01", impactHostname: "", impactPort: "", linkHostname: "" };
    const result = generateTicketFormat("FULL TRAFFIC", "", serpo, "", hostname, "", undefined, false, traffic);
    expect(result).toBe("[PROAKTIF NOC RETAIL] FULL TRAFFIC - UNDER OLT - SBS-MUKO.MUKO-RC-OLT-04 - TO - SBS-PONDOK.SUGUH-NE8000-UPE-01 - SERPO MUKO-MUKO");
    expect(parseTrafficDetails("FULL TRAFFIC", result, hostname, serpo)).toEqual(traffic);
  });
});