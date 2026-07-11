# Indomarco Sales Dashboard & Reporting Web App

Aplikasi Web PWA (Progressive Web App) berbasis mobile-first yang dirancang untuk memantau performa penjualan (*sales*) dan mencatat laporan kunjungan harian serta pencapaian MTD (*Month-to-Date*) secara real-time. Aplikasi ini terintegrasi langsung dengan **Google Sheets** sebagai basis datanya melalui **Google Apps Script API**.

---

## 🚀 Fitur Utama

### Sisi Salesman (Pelaporan Mandiri):
*   **Form Laporan Harian (H & H-1):** Input data kunjungan (Call), kunjungan efektif (Eff Call), jumlah SKU terjual, dan nominal Sales MTD terbaru. Mendukung pencatatan backdate H-1.
*   **Proteksi Validasi MTD:** Sistem secara otomatis memblokir pengiriman jika nilai MTD berjalan yang diinput lebih rendah dari pencapaian yang sudah tercatat sebelumnya pada bulan tersebut (mencegah *rollback* data kumulatif).
*   **Evaluasi Kinerja Mandiri:** Menampilkan sisa target berjalan, grafik lingkaran pencapian target bulanan, serta indikator *Run-Rate* (nominal minimum yang wajib dicapai per sisa hari kerja efektif Senin-Jumat).
*   **Auto Advice:** Menampilkan saran/analisis evaluasi harian otomatis berdasarkan rasio konversi kunjungan dan kepadatan SKU.

### Sisi Supervisor (Dashboard Pemantauan):
*   **Dropdown Filter Bulan Dinamis:** Memilih target bulan kinerja secara dinamis yang otomatis mendeteksi kolom target (`Target_Juni`, `Target_Juli`, dst.) yang ada di database Google Sheets.
*   **Filter Tanggal Kustom (Tabel Kinerja):** Melakukan filter rentang tanggal (Mulai s.d Selesai) khusus pada tabel pencapaian anggota tim. Penghitungan nominal transaksi dalam rentang tanggal dilakukan secara instan di sisi klien menggunakan selisih MTD.
*   **Matriks Klasifikasi Sales Otomatis:** Mengelompokkan sales rep secara cerdas ke dalam 4 kuadran:
    *   **Star:** Pencapaian Target $\ge 90\%$ & Rasio Kunjungan Efektif $\ge 70\%$.
    *   **Potensial:** Pencapaian Target $\ge 90\%$ (kunjungan rendah) ATAU pencapaian $< 90\%$ dengan rasio kunjungan efektif $\ge 70\%$.
    *   **Kurang Efektif:** Pencapaian $< 90\%$ dengan kunjungan tinggi namun rasio efektif $< 70\%$.
    *   **Kritis:** Pencapaian $< 90\%$ dengan kunjungan rendah dan rasio efektif $< 70\%$.
*   **Ekspor Cetak PDF Laporan:** Menyediakan tombol "Cetak PDF" laporan bulanan tim yang rapi dengan Kop Surat resmi PT Indomarco Adi Prima, stempel waktu cetak riil, dan format cetak optimal 1 halaman A4.

---

## 🛠️ Teknologi yang Digunakan

*   **Frontend:** HTML5, CSS3 (Tailwind CSS CDN), Vanilla JavaScript.
*   **Visualisasi Grafik:** Chart.js CDN.
*   **PWA Support:** Service Worker (`sw.js`) untuk caching dinamis & offline fallback, serta `manifest.json` agar aplikasi dapat diinstal di homescreen HP (*Installable PWA*).
*   **Backend & Database:** Google Sheets & Google Apps Script (GAS) Web App API.

---

## 📊 Struktur Database Google Sheets

### 1. Sheet `User_Akses`
Menyimpan data pengguna (kredensial login), role, spoint, dan target bulanan.
| Username | Password | Nama Lengkap | Role | SPOINT | Target_Juni | Target_Juli | ... |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| alvin | spv123 | Alvin Mayrossa | supervisor | SP PASAMAN BARAT | | | |
| wily | wily123 | Wily Maiza Royan | sales | SP PASAMAN BARAT | 950000000 | 1050000000 | |

### 2. Sheet `Log_Harian`
Menyimpan seluruh riwayat log laporan yang dikirim oleh sales rep.
| Timestamp | Nama_Sales | SPOINT | Call | Eff_Call | SKU_Item | Sales_MTD |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-07-01T08:00:00Z | Wily Maiza Royan | SP PASAMAN BARAT | 35 | 25 | 120 | 15000000 |

---

## 📐 Rumus Metrik Bisnis

1.  **Rasio Konversi Kunjungan (Ach Call %):**
    $$\text{Conversion Rate (\%)} = \left( \frac{\text{Kunjungan Efektif}}{\text{Total Kunjungan}} \right) \times 100\%$$
2.  **Kepadatan SKU (SKU Density):**
    $$\text{SKU Density} = \frac{\text{Jumlah SKU Terjual}}{\text{Kunjungan Efektif (Eff Call)}}$$
3.  **Target Harian (Run-Rate):**
    $$\text{Target Harian} = \frac{\text{Total Target Bulanan} - \text{Realisasi MTD Terkini}}{\text{Sisa Hari Kerja Efektif (Senin - Jumat)}}$$

---

## 🚀 Panduan Instalasi & Deployment

### Langkah 1: Setup Backend Google Apps Script
1.  Buat Google Sheets baru di Google Drive Anda.
2.  Buat dua sheet dengan nama **`User_Akses`** dan **`Log_Harian`** sesuai struktur kolom di atas.
3.  Pilih menu **Ekstensi > Apps Script**.
4.  Salin seluruh kode dari file **`Kode.gs`** ke dalam editor Apps Script.
5.  Klik tombol **Terapkan (Deploy) > Penerapan Baru (New Deployment)**.
6.  Pilih jenis penerapan: **Aplikasi Web (Web App)**.
    *   *Jalankan sebagai:* Diri Anda sendiri.
    *   *Siapa yang memiliki akses:* Siapa saja (Anyone).
7.  Klik **Terapkan** dan salin **URL Aplikasi Web** yang dihasilkan.

### Langkah 2: Setup Frontend Web App
1.  Unduh seluruh berkas frontend proyek ini ke server lokal Anda atau direktori hosting.
2.  Buka aplikasi di browser (misal lewat server lokal Anda di `http://localhost:8080`).
3.  Pada halaman Login aplikasi, klik **ikon roda gigi (Settings)** di pojok kanan bawah halaman.
4.  Tempelkan **URL Aplikasi Web** Google Apps Script yang sudah Anda salin pada langkah sebelumnya, lalu klik **Simpan**.
5.  Silakan login menggunakan akun yang terdaftar di sheet `User_Akses`!
