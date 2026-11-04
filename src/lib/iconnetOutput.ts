// Canonical text layout for the 📡 Iconnet Preview Output / clipboard copy.
// Headings keep literal asterisks, every line is separated by a blank line,
// and empty figures stay as "-".

export interface IconnetOutputData {
  resumeAllTime: string;
  resumeAllDate: string;
  sumselAll: string;
  bangkaBelitungAll: string;
  bengkuluAll: string;
  jambiAll: string;
  lampungAll: string;
  posisiNocRitel: string;
  posisiTiketOutbond: string;
  totalTiket: string;
  resumeGangguanTime: string;
  retailSbsHari: string;
  resumeGangguanDate: string;
  totalGangguan: string;
  sumselGangguan: string;
  bangkaBelitungGangguan: string;
  bengkuluGangguan: string;
  jambiGangguan: string;
  lampungGangguan: string;
}

export const HARI_LABELS: Record<string, string> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
};

export const formatIconnetValue = (val: string) => val.trim() || "-";

export const formatIconnetDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const buildIconnetOutput = (data: IconnetOutputData) => {
  const hariLabel = data.retailSbsHari ? HARI_LABELS[data.retailSbsHari] || "-" : "-";

  return [
    `*All Ticket Open Incident Pukul ${formatIconnetValue(data.resumeAllTime)}*`,
    `Gangguan Retail SBS Tanggal ${formatIconnetDate(data.resumeAllDate)}`,
    "Dengan Penyebaran :",
    `* Sumsel = ${formatIconnetValue(data.sumselAll)}`,
    `* Bangka Belitung = ${formatIconnetValue(data.bangkaBelitungAll)}`,
    `* Bengkulu = ${formatIconnetValue(data.bengkuluAll)}`,
    `* Jambi = ${formatIconnetValue(data.jambiAll)}`,
    `* Lampung = ${formatIconnetValue(data.lampungAll)}`,
    `Posisi NOC Ritel SBU = ${formatIconnetValue(data.posisiNocRitel)}`,
    `Posisi Tiket Outbond, Back Office, NOC Pusat, CM Ritel Dll = ${formatIconnetValue(data.posisiTiketOutbond)}`,
    `Total Tiket = ${formatIconnetValue(data.totalTiket)}`,
    "=================================",
    `*Ticket Gangguan Over SLA Pukul ${formatIconnetValue(data.resumeGangguanTime)}*`,
    `*Retail SBS = ${hariLabel} Hari*`,
    `Gangguan Retail SBS Tanggal ${formatIconnetDate(data.resumeGangguanDate)}`,
    `Total gangguan = ${formatIconnetValue(data.totalGangguan)}`,
    "Dengan Penyebaran : ",
    `* Sumsel = ${formatIconnetValue(data.sumselGangguan)}`,
    `* Bangka Belitung = ${formatIconnetValue(data.bangkaBelitungGangguan)}`,
    `* Bengkulu = ${formatIconnetValue(data.bengkuluGangguan)}`,
    `* Jambi = ${formatIconnetValue(data.jambiGangguan)}`,
    `* Lampung = ${formatIconnetValue(data.lampungGangguan)}`,
  ].join("\n\n");
};
