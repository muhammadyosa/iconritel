## Tujuan

Menerapkan gaya tampilan compact + informatif (seperti **NOC Statistik Incident** yang sudah selesai) ke 6 seksi pada **🖥️ Dashboard Overview**:

1. 🗺️ Regional Office
2. 📦 Incident Ritel
3. ⚡ Incident Feeder
4. 🏆 Tier Incident OVER SLA
5. 📋 Report Shift
6. 🕒 Recent Activity

## Prinsip & Batasan Penting

- **Logika & data tidak diubah** — hanya struktur visual / layout / sizing.
- **Tidak rewrite komponen reusable** secara destructive. `RegionalOfficeTab`, `ShiftReportCard`, dan `RecentActivity` juga dipakai di halaman lain (Report, Teams, dst). Untuk komponen-komponen ini saya akan:
  - Tambah prop `variant="dashboard"` (default = perilaku lama) yang merender versi compact baru.
  - Halaman lain tetap pakai versi default → **zero regression** di luar Dashboard.
- Komponen khusus dashboard yang aman di-rewrite penuh: `DashboardTierOverSLA`, dan blok Ritel/Feeder yang inline di `Dashboard.tsx`.

## Pola Visual yang Diterapkan ke Semua Seksi

Konsisten dengan NOC Statistik:
- Header bar tipis: emoji + judul + sub-label + chip status realtime di kanan.
- **KPI strip** 4–6 tile dengan micro-typography (`text-[8px]`–`text-[10px]`), warna semantik (success / warning / destructive / primary).
- **Mini-visual**: sparkline 14-hari / inline-stacked-bar / progress-bar / ranking list — disesuaikan per seksi.
- **Panel "Analisa Statistik"** ringkas di bawah dengan grid 2/4 kolom + insight dinamis berdasar threshold.
- Padding diperkecil (`p-2 sm:p-2.5`), border `border-border/40`, background `bg-muted/10`.

## Rincian Per Seksi

### 1. 🗺️ Regional Office  (`RegionalOfficeTab.tsx`)
- Tambah `variant="dashboard"` → render mode compact.
- KPI strip per-region: Total / Resolved / Pending / Critical / Resolution-Rate.
- Mini bar horizontal per region dengan progress resolusi.
- Top 3 region paling kritis disorot dengan emoji 🥇🥈🥉.
- Analisa: region dominan, rasio resolusi rata-rata, region perlu perhatian.

### 2. 📦 Incident Ritel & 3. ⚡ Incident Feeder
- Blok ini sudah inline di `Dashboard.tsx` (lines 1117–1327) → rewrite langsung di sana.
- Twin compact panel (grid `md:grid-cols-2`), masing-masing:
  - Header dengan badge Total + Critical count + sparkline 7-hari.
  - Mini KPI: Total / Progres / Kritis / Tertunda / Selesai (5 chip).
  - Top 5 constraint (gradient horizontal bar) — bukan list tabular.
  - 1 baris insight (mis. "🔥 LINK LOSS dominan 38% — perlu audit FAT").

### 4. 🏆 Tier Incident OVER SLA  (`DashboardTierOverSLA.tsx`)
- Rewrite penuh (komponen Dashboard-only).
- Header chip: total Over SLA, rata-rata durasi, max durasi.
- Top 5 ranking (bukan 20) dengan progress bar, sisanya jadi mini-list `text-[9px]`.
- Donut/segmented bar untuk distribusi Critical/Pending/On Progress.
- Panel Analisa: region dominan, breakdown status, rekomendasi.

### 5. 📋 Report Shift  (`ShiftReportCard.tsx` + blok di `Dashboard.tsx`)
- Tambah `variant="dashboard"` di `ShiftReportCard` → mode super-compact 1-baris dengan: tanggal • shift emoji • petugas • chip jumlah isu • indicator OLT/PORT/FAT.
- Di Dashboard tambahkan KPI header: shift hari ini / total laporan 7-hari / total isu 7-hari / petugas aktif.
- Mini timeline 7-hari menampilkan status keberadaan laporan per shift.

### 6. 🕒 Recent Activity  (`RecentActivity.tsx`)
- Tambah `variant="dashboard"` → render compact feed.
- KPI strip: aktivitas 24-jam, top actor, kategori dominan.
- Item baris satuan jadi: emoji aksi + nama (text-[10px]) + chip waktu relatif.
- Filter tab dihilangkan di mode dashboard (cuma "Semua, 20 terbaru").

## Eksekusi

Semua perubahan dikerjakan sekaligus dalam satu batch parallel-edit:

```text
Files edited:
- src/components/RegionalOfficeTab.tsx          (+variant dashboard)
- src/components/DashboardTierOverSLA.tsx       (full rewrite)
- src/components/ShiftReportCard.tsx            (+variant dashboard)
- src/components/RecentActivity.tsx             (+variant dashboard)
- src/pages/Dashboard.tsx                       (rewrite blok Ritel/Feeder + props variant)
```

## Verifikasi

- Build pass (otomatis via harness).
- Manual cek visual pada Dashboard `/` viewport mobile + desktop.
- Halaman lain (`/report`, `/teams`) tidak terdampak karena pakai variant default.

## Estimasi Risiko

Sedang. Resiko utama: tampilan halaman lain yang juga memakai komponen tersebut — dimitigasi dengan strategi `variant` prop.
