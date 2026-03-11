export interface RegionalTeamRecord {
  id: string;
  region: string;       // e.g., "JAMBI", "LAMPUNG"
  serpoType: string;    // "RITEL" or "FEEDER"
  serpoName: string;    // e.g., "RITEL JAMBI", "FEEDER LAMPUNG"
  mitraName: string;    // e.g., "INTERNAL JAMBI", "SERPO BUNGO"
  hostnames: string[];  // OLT hostnames assigned to this mitra
  teamMember: string;   // Nama Tim member
  createdAt: string;
}
