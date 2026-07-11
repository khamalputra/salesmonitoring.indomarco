# **PRODUCT REQUIREMENT DOCUMENT (PRD)**

## **Proyek: Indomarco Sales Dashboard Web App (Google Apps Script)**

**Versi:** 1.1 (Updated \- Direct MTD Input)

**Author:** Product & Engineering Team

**Konteks Target:** Tim Penjualan di bawah Supervisor **Panji Anugrah**

## **1\. PENDAHULUAN & LATAR BELAKANG**

Sistem pemantauan harian tim sales Indomarco saat ini masih mengandalkan pengisian lembar kerja (*spreadsheet*) secara manual (seperti terlihat pada berkas image\_44ce9e.png). Sistem ini memiliki kelemahan kritis:

1. **Eror Formula \#DIV/0\!**: Terjadi ketika tim sales belum melakukan kunjungan (CALL dan EFF CALL bernilai kosong atau 0), merusak kalkulasi persentase pencapaian (ACH %).  
2. **Desinkronisasi Data MTD**: Penjumlahan manual di baris akumulasi total wilayah sering kali rusak atau terpotong ketika baris harian baru disisipkan.  
3. **Kepadatan Informasi (*Cognitive Overload*)**: Visualisasi spreadsheet yang penuh dengan warna merah dan biru kontras tinggi menyulitkan supervisor untuk melakukan pengawasan terfokus.

### **1.1 Solusi Sistem Baru (Revisi Alur Kerja MTD)**

Membangun web app berbasis **Google Apps Script (GAS)** dengan database **Google Sheets**. Berbeda dengan sistem sebelumnya yang menjumlahkan omset harian secara manual, **tim sales kini akan langsung menginput nilai Sales MTD kumulatif terbaru** yang mereka terima dari laporan email harian resmi.

Sistem akan memproses data dengan aturan logika berikut:

* **Data Kunjungan harian** (Call, Eff Call, dan SKU Item) akan diakumulasikan menggunakan fungsi penjumlahan (![][image1]).  
* **Data Penjualan** (Sales MTD) tidak dijumlahkan dari log harian, melainkan sistem akan mengambil **nilai entri terbaru (terakhir)** yang dikirimkan oleh masing-masing sales sebagai representasi pencapaian MTD real-time mereka.

## **2\. ARSITEKTUR DATABASE (GOOGLE SHEETS)**

Aplikasi ini membutuhkan satu file Google Sheets yang dibagi menjadi 2 sheet utama sebagai penyimpan data (*database*).

### **2.1 Sheet 1: User\_Akses**

Menyimpan akun login, peran, daerah penugasan (SPOINT), dan target bulanan.

* **Kolom:** Username, Password, Nama, Role, SPOINT, Target\_Juni  
* **Skema Data Contoh:**  
  | Username | Password | Nama | Role | SPOINT | Target\_Juni |  
  | :--- | :--- | :--- | :--- | :--- | :--- |  
  | panji | spv123 | Panji Anugrah | supervisor | All Area | 7512758571 |  
  | alvin | sales123 | ALVIN MAYROSSA | sales | SP PASAMAN BARAT | 1469308620 |  
  | wily | sales123 | WILY MAIZA ROYAN | sales | SP LUHAK NAN DUO | 1369112989 |  
  | yogi | sales123 | YOGI PRATAMA | sales | SP LUHAK NAN DUO | 653276899 |  
  | fillar | sales123 | FILLAR | sales | SP LEMBAH MELINTANG | 1398559363 |  
  | megi | sales123 | MEGI VEVIALDY | sales | SP LEMBAH MELINTANG | 1261208254 |  
  | adri | sales123 | ADRI ANDIKA | sales | SP AIR BANGIS | 1361292446 |

### **2.2 Sheet 2: Log\_Harian**

Menyimpan data transaksi harian mentah yang dikirim oleh tim sales melalui web app.

* **Kolom:** Timestamp, Nama\_Sales, SPOINT, Call, Eff\_Call, SKU\_Item, Sales\_MTD

## **3\. IDENTITAS VISUAL & TEMA WARNA (INDOMARCO THEME)**

Sesuai logo resmi Indomarco (image\_44d5c1.png), palet warna aplikasi diatur sangat ketat untuk menjamin konsistensi citra perusahaan:

* **Primary (Biru Indomarco)**: \#0000B3 (Aksen formalitas, kestabilan, kepemimpinan)  
* **Accent (Merah/Magenta Indomarco)**: \#E6005C (Aksen aksi, penunjuk tombol penting, peringatan sisa kekurangan)  
* **Light Neutral (Latar Belakang)**: \#F9FAFB (Guna menghindari kelelahan mata akibat kontras warna ekstrim)

## **4\. KODE BACKEND: Kode.gs**

Salin kode berikut dan tempelkan ke berkas script Google Apps Script Anda. Kode ini telah disesuaikan agar **tidak menjumlahkan** nilai Sales\_MTD, melainkan mengambil entri nilai MTD paling akhir yang diinput oleh sales.

/\*\*  
 \* Main handler to serve the web application.  
 \*/  
function doGet() {  
  return HtmlService.createTemplateFromFile('Index')  
      .evaluate()  
      .setTitle('Indomarco Sales Dashboard')  
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)  
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');  
}

/\*\*  
 \* Validates user credentials.  
 \*/  
function checkLogin(username, password) {  
  try {  
    var sheet \= SpreadsheetApp.getActiveSpreadsheet().getSheetByName("User\_Akses");  
    var data \= sheet.getDataRange().getValues();  
      
    for (var i \= 1; i \< data.length; i++) {  
      if (data\[i\]\[0\].toString().trim().toLowerCase() \=== username.trim().toLowerCase() &&   
          data\[i\]\[1\].toString().trim() \=== password.trim()) {  
        return {  
          success: true,  
          username: data\[i\]\[0\],  
          nama: data\[i\]\[2\],  
          role: data\[i\]\[3\],  
          spoint: data\[i\]\[4\],  
          target: Number(data\[i\]\[5\])  
        };  
      }  
    }  
    return { success: false, message: "Username atau password salah\!" };  
  } catch (error) {  
    return { success: false, message: "Koneksi database gagal: " \+ error.toString() };  
  }  
}

/\*\*  
 \* Saves daily sales transaction log sent by sales officers.  
 \*/  
function saveDailyLog(salesData) {  
  try {  
    var ss \= SpreadsheetApp.getActiveSpreadsheet();  
    var sheet \= ss.getSheetByName("Log\_Harian");  
      
    sheet.appendRow(\[  
      new Date(),  
      salesData.nama,  
      salesData.spoint,  
      Number(salesData.call),  
      Number(salesData.effCall),  
      Number(salesData.skuItem),  
      Number(salesData.salesMtd) // Menyimpan nilai MTD akumulatif langsung dari email  
    \]);  
      
    return { success: true, message: "Laporan MTD berhasil disimpan\!" };  
  } catch (error) {  
    return { success: false, message: "Gagal menyimpan data: " \+ error.toString() };  
  }  
}

/\*\*  
 \* Calculates current MTD performance and lists sales statistics without DIV/0 error.  
 \*/  
function getPerformanceData() {  
  try {  
    var ss \= SpreadsheetApp.getActiveSpreadsheet();  
    var userSheet \= ss.getSheetByName("User\_Akses");  
    var logSheet \= ss.getSheetByName("Log\_Harian");  
      
    var users \= userSheet.getDataRange().getValues();  
    var logs \= logSheet.getDataRange().getValues();  
      
    var salesMetrics \= {};  
      
    // Initialize metrics based on active sales users  
    for (var i \= 1; i \< users.length; i++) {  
      var username \= users\[i\]\[0\];  
      var nama \= users\[i\]\[2\];  
      var role \= users\[i\]\[3\];  
      var spoint \= users\[i\]\[4\];  
      var target \= Number(users\[i\]\[5\]);  
        
      if (role \=== "sales") {  
        salesMetrics\[nama\] \= {  
          nama: nama,  
          spoint: spoint,  
          target: target,  
          totalCall: 0,  
          totalEffCall: 0,  
          totalSku: 0,  
          salesMtd: 0, // Akan diupdate ke entri inputan terbaru  
          logsCount: 0  
        };  
      }  
    }  
      
    // Process logs data  
    for (var j \= 1; j \< logs.length; j++) {  
      var name \= logs\[j\]\[1\];  
      if (salesMetrics\[name\]) {  
        salesMetrics\[name\].totalCall \+= Number(logs\[j\]\[3\]);  
        salesMetrics\[name\].totalEffCall \+= Number(logs\[j\]\[4\]);  
        salesMetrics\[name\].totalSku \+= Number(logs\[j\]\[5\]);  
          
        // PENTING: Karena tim sales menginput Sales MTD kumulatif secara langsung,  
        // kita tidak menjumlahkannya melainkan selalu meng-update ke nilai entri terbaru (terakhir diinput).  
        salesMetrics\[name\].salesMtd \= Number(logs\[j\]\[6\]);  
        salesMetrics\[name\].logsCount \+= 1;  
      }  
    }  
      
    var dashboardList \= \[\];  
    var totalTargetArea \= 0;  
    var totalSalesArea \= 0;  
    var totalCallArea \= 0;  
    var totalEffCallArea \= 0;  
    var totalSkuArea \= 0;  
      
    for (var key in salesMetrics) {  
      var s \= salesMetrics\[key\];  
        
      // SAFE DIVISION PREVENTS \#DIV/0\!  
      var achCallPct \= s.totalCall \> 0 ? Math.round((s.totalEffCall / s.totalCall) \* 100\) : 0;  
      var achSalesPct \= s.target \> 0 ? Math.round((s.salesMtd / s.target) \* 100\) : 0;  
      var achItem \= s.totalCall \> 0 ? Number((s.totalSku / s.totalCall).toFixed(1)) : 0;  
      var kekurangan \= s.target \- s.salesMtd;  
      if (kekurangan \< 0\) kekurangan \= 0;  
        
      totalTargetArea \+= s.target;  
      totalSalesArea \+= s.salesMtd; // Akumulasi total wilayah adalah penjumlahan dari MTD terakhir masing-masing sales  
      totalCallArea \+= s.totalCall;  
      totalEffCallArea \+= s.totalEffCall;  
      totalSkuArea \+= s.totalSku;  
        
      dashboardList.push({  
        nama: s.nama,  
        spoint: s.spoint,  
        target: s.target,  
        totalCall: s.totalCall,  
        totalEffCall: s.totalEffCall,  
        achCallPct: achCallPct,  
        achItem: achItem,  
        salesMtd: s.salesMtd,  
        achSalesPct: achSalesPct,  
        kekurangan: kekurangan  
      });  
    }  
      
    // Sort by achievement descending  
    dashboardList.sort(function(a, b) { return b.achSalesPct \- a.achSalesPct; });  
      
    var areaAchCallPct \= totalCallArea \> 0 ? Math.round((totalEffCallArea / totalCallArea) \* 100\) : 0;  
    var areaAchSalesPct \= totalTargetArea \> 0 ? Math.round((totalSalesArea / totalTargetArea) \* 100\) : 0;  
    var areaKekurangan \= totalTargetArea \- totalSalesArea;  
    if (areaKekurangan \< 0\) areaKekurangan \= 0;  
      
    return {  
      success: true,  
      salesList: dashboardList,  
      summary: {  
        totalTarget: totalTargetArea,  
        totalSales: totalSalesArea,  
        totalCall: totalCallArea,  
        totalEffCall: totalEffCallArea,  
        achCallPct: areaAchCallPct,  
        achSalesPct: areaAchSalesPct,  
        kekurangan: areaKekurangan  
      }  
    };  
      
  } catch (error) {  
    return { success: false, message: "Gagal memuat data: " \+ error.toString() };  
  }  
}

## **5\. KODE FRONTEND SINGLE-FILE: Index.html**

Berkas ini telah disesuaikan agar label pada form input meminta sales mengisikan nilai **Sales MTD s/d Hari Ini** sesuai format laporan email yang mereka terima.

\<\!DOCTYPE html\>  
\<html\>  
  \<head\>  
    \<meta charset="UTF-8"\>  
    \<title\>Indomarco Sales Dashboard\</title\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<\!-- Tailwind CSS CDN \--\>  
    \<script src="https://cdn.tailwindcss.com"\>\</script\>  
    \<\!-- Chart.js CDN \--\>  
    \<script src="https://cdn.jsdelivr.net/npm/chart.js"\>\</script\>  
    \<script\>  
      // Tailwind custom theme configuration matching Indomarco Color Palette  
      tailwind.config \= {  
        theme: {  
          extend: {  
            colors: {  
              indomarcoBlue: '\#0000B3',  
              indomarcoRed: '\#E6005C',  
            }  
          }  
        }  
      }  
    \</script\>  
    \<style\>  
      .loader {  
        border-top-color: \#E6005C;  
        \-webkit-animation: spinner 1.5s linear infinite;  
        animation: spinner 1.5s linear infinite;  
      }  
      @-webkit-keyframes spinner {  
        0% { \-webkit-transform: rotate(0deg); }  
        100% { \-webkit-transform: rotate(360deg); }  
      }  
      @keyframes spinner {  
        0% { transform: rotate(0deg); }  
        100% { transform: rotate(360deg); }  
      }  
    \</style\>  
  \</head\>  
  \<body class="bg-gray-50 text-gray-800 font-sans antialiased min-h-screen flex flex-col"\>

    \<\!-- \================= LOADING SPINNER GLOBAL \================= \--\>  
    \<div id="loadingOverlay" class="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center hidden"\>  
      \<div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"\>\</div\>  
      \<h2 class="text-center text-gray-600 text-sm font-semibold"\>Memuat Data Sistem...\</h2\>  
    \</div\>

    \<\!-- \================= HALAMAN LOGIN \================= \--\>  
    \<div id="loginPage" class="min-h-screen flex items-center justify-center px-4"\>  
      \<div class="bg-white rounded-xl shadow-2xl border-t-8 border-indomarcoBlue p-8 max-w-md w-full"\>  
        \<div class="text-center mb-8"\>  
          \<h1 class="text-4xl font-extrabold text-indomarcoBlue tracking-wider"\>INDOMARCO\</h1\>  
          \<p class="text-xs text-indomarcoRed font-bold tracking-widest mt-1.5 uppercase"\>Sales Performance Engine\</p\>  
        \</div\>

        \<div id="errorMessage" class="hidden bg-red-50 border-l-4 border-indomarcoRed text-indomarcoRed p-3 rounded-lg text-xs mb-5 font-semibold"\>\</div\>

        \<form id="loginForm" onsubmit="executeLogin(event)" class="space-y-5"\>  
          \<div\>  
            \<label class="block text-xs font-bold text-gray-600 uppercase mb-1"\>Username\</label\>  
            \<input type="text" id="username" required class="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indomarcoBlue text-sm"\>  
          \</div\>  
          \<div\>  
            \<label class="block text-xs font-bold text-gray-600 uppercase mb-1"\>Password\</label\>  
            \<input type="password" id="password" required class="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indomarcoBlue text-sm"\>  
          \</div\>  
          \<button type="submit" id="loginBtn" class="w-full bg-indomarcoRed hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 uppercase tracking-wider text-xs"\>  
            Masuk ke Dashboard  
          \</button\>  
        \</form\>  
      \</div\>  
    \</div\>

    \<\!-- \================= PANEL UTAMA WEB APP (DASHBOARD) \================= \--\>  
    \<div id="appContainer" class="hidden flex flex-col min-h-screen"\>  
      \<\!-- Navbar Utama \--\>  
      \<header class="bg-indomarcoBlue text-white shadow-lg p-4 flex justify-between items-center border-b-4 border-indomarcoRed sticky top-0 z-40"\>  
        \<div class="flex items-center space-x-2"\>  
          \<span class="text-lg font-black tracking-widest"\>INDOMARCO\</span\>  
        \</div\>  
        \<div class="flex items-center space-x-3"\>  
          \<span id="userBadge" class="text-xs bg-white/10 px-3 py-1.5 rounded-lg font-bold"\>\</span\>  
          \<button onclick="executeLogout()" class="text-xs bg-indomarcoRed hover:bg-pink-700 px-3 py-1.5 rounded-lg font-extrabold transition duration-200 shadow"\>LOGOUT\</button\>  
        \</div\>  
      \</header\>

      \<\!-- Container Konten Dinamis \--\>  
      \<main class="flex-grow p-4 md:p-6 max-w-7xl w-full mx-auto"\>  
          
        \<\!-- SISI SALES: Form Input \--\>  
        \<div id="salesSection" class="hidden max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 border border-gray-200"\>  
          \<div class="border-b pb-3 mb-5"\>  
            \<h2 class="text-lg font-bold text-indomarcoBlue flex items-center"\>  
              \<span class="w-3.5 h-3.5 bg-indomarcoRed rounded-full mr-2"\>\</span\> LAPORAN REAL-TIME SALES  
            \</h2\>  
            \<p class="text-xs text-gray-500 mt-1"\>Isi data harian dan nilai MTD terbaru berdasarkan email report Anda.\</p\>  
          \</div\>

          \<div id="formAlert" class="hidden p-3 rounded-lg text-xs font-bold mb-4"\>\</div\>

          \<form id="dailyForm" onsubmit="submitFormSales(event)" class="space-y-4"\>  
            \<div\>  
              \<label class="block text-xs font-bold text-gray-600 mb-1"\>Total Call Hari Ini (Kunjungan)\</label\>  
              \<input type="number" id="formCall" required min="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indomarcoBlue text-sm" placeholder="Contoh: 35"\>  
            \</div\>  
            \<div\>  
              \<label class="block text-xs font-bold text-gray-600 mb-1"\>Effective Call Hari Ini (Eff Call)\</label\>  
              \<input type="number" id="formEffCall" required min="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indomarcoBlue text-sm" placeholder="Contoh: 20"\>  
            \</div\>  
            \<div\>  
              \<label class="block text-xs font-bold text-gray-600 mb-1"\>SKU Item Terjual Hari Ini\</label\>  
              \<input type="number" id="formSku" required min="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indomarcoBlue text-sm" placeholder="Contoh: 150"\>  
            \</div\>  
            \<div class="bg-pink-50/50 p-3 rounded-lg border border-pink-100"\>  
              \<label class="block text-xs font-bold text-indomarcoRed mb-1"\>Nilai Sales MTD s/d Hari Ini (Rupiah)\</label\>  
              \<p class="text-\[10px\] text-gray-500 mb-1.5"\>⚠️ Masukkan total akumulasi MTD berjalan Anda saat ini (sesuai data laporan email harian).\</p\>  
              \<input type="number" id="formSalesMtd" required min="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indomarcoBlue text-sm" placeholder="Contoh: 1275894756"\>  
            \</div\>  
            \<button type="submit" class="w-full bg-indomarcoRed hover:bg-pink-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md uppercase tracking-wider text-xs transition duration-200"\>  
              Kirim Data Real-Time MTD  
            \</button\>  
          \</form\>  
        \</div\>

        \<\!-- SISI SUPERVISOR: Monitoring Dashboard \--\>  
        \<div id="supervisorSection" class="hidden space-y-6"\>  
          \<\!-- Judul & Tombol Refresh \--\>  
          \<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"\>  
            \<div\>  
              \<h2 class="text-2xl font-black text-indomarcoBlue"\>DASHBOARD SUPERVISOR\</h2\>  
              \<p class="text-xs text-gray-500"\>Menganalisis pencapaian MTD tim di bawah kendali supervisor.\</p\>  
            \</div\>  
            \<button onclick="loadSupervisorDashboard()" class="bg-indomarcoBlue hover:bg-blue-900 text-white text-xs font-bold py-2 px-4 rounded-lg shadow transition duration-200"\>  
              Refresh Data  
            \</button\>  
          \</div\>

          \<\!-- Cards Summary Area (Real-time MTD) \--\>  
          \<div class="grid grid-cols-1 md:grid-cols-3 gap-4"\>  
            \<div class="bg-white p-5 rounded-xl shadow border-l-4 border-indomarcoBlue"\>  
              \<span class="text-xs text-gray-500 font-extrabold uppercase tracking-widest"\>Target Juni Wilayah\</span\>  
              \<p id="sumTarget" class="text-2xl font-black text-indomarcoBlue mt-1"\>Rp 0\</p\>  
            \</div\>  
            \<div class="bg-white p-5 rounded-xl shadow border-l-4 border-green-500"\>  
              \<span class="text-xs text-gray-500 font-extrabold uppercase tracking-widest"\>Total Sales MTD (Pencapaian)\</span\>  
              \<p id="sumSales" class="text-2xl font-black text-green-600 mt-1"\>Rp 0 \<span id="sumAchPercent" class="text-sm font-semibold"\> (0%)\</span\>\</p\>  
            \</div\>  
            \<div class="bg-white p-5 rounded-xl shadow border-l-4 border-indomarcoRed"\>  
              \<span class="text-xs text-gray-500 font-extrabold uppercase tracking-widest"\>Sisa Kekurangan Wilayah\</span\>  
              \<p id="sumKekurangan" class="text-2xl font-black text-indomarcoRed mt-1"\>Rp 0\</p\>  
            \</div\>  
          \</div\>

          \<\!-- Bagian Grafik & Kinerja Anggota \--\>  
          \<div class="grid grid-cols-1 lg:grid-cols-3 gap-6"\>  
            \<\!-- Tabel Performa Tim \--\>  
            \<div class="lg:col-span-2 bg-white rounded-xl shadow overflow-hidden border border-gray-200"\>  
              \<div class="bg-gray-100 px-4 py-3 border-b border-gray-200"\>  
                \<h3 class="text-sm font-bold text-indomarcoBlue"\>Kinerja Real-time Anggota Sales (MTD Terkini)\</h3\>  
              \</div\>  
              \<div class="overflow-x-auto"\>  
                \<table class="min-w-full text-xs"\>  
                  \<thead class="bg-gray-50 text-gray-500 font-extrabold uppercase"\>  
                    \<tr\>  
                      \<th class="px-4 py-3 text-left"\>Nama Sales\</th\>  
                      \<th class="px-4 py-3 text-left"\>SPOINT\</th\>  
                      \<th class="px-4 py-3 text-right"\>Target Juni\</th\>  
                      \<th class="px-4 py-3 text-center"\>Ach Call %\</th\>  
                      \<th class="px-4 py-3 text-center"\>Ach Item\</th\>  
                      \<th class="px-4 py-3 text-right"\>Sales MTD\</th\>  
                      \<th class="px-4 py-3 text-center"\>ACH %\</th\>  
                      \<th class="px-4 py-3 text-right"\>Kekurangan\</th\>  
                    \</tr\>  
                  \</thead\>  
                  \<tbody id="salesTableBody" class="divide-y divide-gray-200"\>  
                    \<\!-- Data diletakkan secara dinamis \--\>  
                  \</tbody\>  
                \</table\>  
              \</div\>  
            \</div\>

            \<\!-- Panel Grafik Visualisasi Target \--\>  
            \<div class="bg-white rounded-xl shadow p-5 border border-gray-200 flex flex-col justify-between"\>  
              \<div\>  
                \<h3 class="text-sm font-bold text-indomarcoBlue border-b pb-2 mb-4"\>Grafik Distribusi Penjualan\</h3\>  
                \<div class="relative w-full aspect-square max-h-\[250px\] mx-auto"\>  
                  \<canvas id="targetPieChart"\>\</canvas\>  
                \</div\>  
              \</div\>  
              \<div class="mt-4 bg-gray-50 p-3 rounded-lg text-xs space-y-1 text-gray-600"\>  
                \<p class="font-bold text-indomarcoBlue mb-1"\>Catatan Supervisor:\</p\>  
                \<p\>⚠️ Fokus pembinaan dialokasikan ke sales yang memiliki persentase \*\*ACH % di bawah 90%\*\*.\</p\>  
              \</div\>  
            \</div\>  
          \</div\>

        \</div\>

      \</main\>

      \<\!-- Footer Bawah \--\>  
      \<footer class="bg-gray-800 text-white text-center py-3 text-xs mt-auto"\>  
        \<p\>© 2026 PT Indomarco Adi Prima. All Rights Reserved.\</p\>  
      \</footer\>  
    \</div\>

    \<\!-- \================= JAVASCRIPT LOGIC CLIENT-SIDE \================= \--\>  
    \<script\>  
      let currentUser \= null;  
      let globalChart \= null;

      function toggleOverlay(show) {  
        const overlay \= document.getElementById('loadingOverlay');  
        if (show) {  
          overlay.classList.remove('hidden');  
        } else {  
          overlay.classList.add('hidden');  
        }  
      }

      function executeLogin(event) {  
        event.preventDefault();  
        toggleOverlay(true);  
          
        const u \= document.getElementById('username').value;  
        const p \= document.getElementById('password').value;  
        const errMsg \= document.getElementById('errorMessage');  
          
        errMsg.classList.add('hidden');

        // Memanggil GAS backend function  
        google.script.run  
          .withSuccessHandler(function(res) {  
            toggleOverlay(false);  
            if (res.success) {  
              currentUser \= res;  
              showAppLayout();  
            } else {  
              errMsg.innerText \= res.message;  
              errMsg.classList.remove('hidden');  
            }  
          })  
          .withFailureHandler(function(err) {  
            toggleOverlay(false);  
            errMsg.innerText \= "Koneksi ke server terputus. Silakan ulangi kembali.";  
            errMsg.classList.remove('hidden');  
          })  
          .checkLogin(u, p);  
      }

      function showAppLayout() {  
        document.getElementById('loginPage').classList.add('hidden');  
        document.getElementById('appContainer').classList.remove('hidden');  
        document.getElementById('userBadge').innerText \= currentUser.nama \+ " (" \+ currentUser.role.toUpperCase() \+ ")";

        if (currentUser.role \=== 'supervisor') {  
          document.getElementById('supervisorSection').classList.remove('hidden');  
          document.getElementById('salesSection').classList.add('hidden');  
          loadSupervisorDashboard();  
        } else if (currentUser.role \=== 'sales') {  
          document.getElementById('salesSection').classList.remove('hidden');  
          document.getElementById('supervisorSection').classList.add('hidden');  
          document.getElementById('dailyForm').reset();  
          document.getElementById('formAlert').classList.add('hidden');  
        }  
      }

      function executeLogout() {  
        currentUser \= null;  
        document.getElementById('appContainer').classList.add('hidden');  
        document.getElementById('loginPage').classList.remove('hidden');  
        document.getElementById('loginForm').reset();  
        document.getElementById('errorMessage').classList.add('hidden');  
      }

      function submitFormSales(event) {  
        event.preventDefault();  
        toggleOverlay(true);

        const data \= {  
          nama: currentUser.nama,  
          spoint: currentUser.spoint,  
          call: document.getElementById('formCall').value,  
          effCall: document.getElementById('formEffCall').value,  
          skuItem: document.getElementById('formSku').value,  
          salesMtd: document.getElementById('formSalesMtd').value // Input langsung MTD  
        };

        const alertDiv \= document.getElementById('formAlert');  
        alertDiv.classList.add('hidden');

        google.script.run  
          .withSuccessHandler(function(res) {  
            toggleOverlay(false);  
            if (res.success) {  
              alertDiv.className \= "p-3 rounded-lg text-xs font-bold mb-4 bg-green-50 text-green-700 border-l-4 border-green-500";  
              alertDiv.innerText \= res.message;  
              alertDiv.classList.remove('hidden');  
              document.getElementById('dailyForm').reset();  
            } else {  
              alertDiv.className \= "p-3 rounded-lg text-xs font-bold mb-4 bg-red-50 text-indomarcoRed border-l-4 border-indomarcoRed";  
              alertDiv.innerText \= res.message;  
              alertDiv.classList.remove('hidden');  
            }  
          })  
          .withFailureHandler(function() {  
            toggleOverlay(false);  
            alertDiv.className \= "p-3 rounded-lg text-xs font-bold mb-4 bg-red-50 text-indomarcoRed border-l-4 border-indomarcoRed";  
            alertDiv.innerText \= "Komunikasi dengan server terganggu.";  
            alertDiv.classList.remove('hidden');  
          })  
          .saveDailyLog(data);  
      }

      function loadSupervisorDashboard() {  
        toggleOverlay(true);  
        google.script.run  
          .withSuccessHandler(function(res) {  
            toggleOverlay(false);  
            if (res.success) {  
              renderSupervisorData(res);  
            } else {  
              alert("Gagal merender data supervisor: " \+ res.message);  
            }  
          })  
          .withFailureHandler(function() {  
            toggleOverlay(false);  
            alert("Koneksi gagal saat memperbarui data dashboard.");  
          })  
          .getPerformanceData();  
      }

      function renderSupervisorData(data) {  
        // Render Card Summary  
        document.getElementById('sumTarget').innerText \= formatRupiah(data.summary.totalTarget);  
        document.getElementById('sumSales').innerHTML \= formatRupiah(data.summary.totalSales) \+ \` \<span class="text-sm font-bold text-green-600"\>(${data.summary.achSalesPct}%)\</span\>\`;  
        document.getElementById('sumKekurangan').innerText \= formatRupiah(data.summary.kekurangan);

        // Render Tabel  
        const tbody \= document.getElementById('salesTableBody');  
        tbody.innerHTML \= "";

        let namesForChart \= \[\];  
        let salesForChart \= \[\];

        data.salesList.forEach(function(salesman) {  
          namesForChart.push(salesman.nama);  
          salesForChart.push(salesman.salesMtd);

          // Tanda peringatan khusus jika pencapaian di bawah 90% (Seperti Megi)  
          const alertClass \= salesman.achSalesPct \< 90 ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50";  
          const progressBadge \= salesman.achSalesPct \>= 95 ? "bg-green-100 text-green-800" : (salesman.achSalesPct \>= 90 ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-indomarcoRed");

          const tr \= document.createElement('tr');  
          tr.className \= alertClass \+ " transition-colors";  
          tr.innerHTML \= \`  
            \<td class="px-4 py-3 font-semibold text-gray-700"\>${salesman.nama}\</td\>  
            \<td class="px-4 py-3 text-gray-500"\>${salesman.spoint}\</td\>  
            \<td class="px-4 py-3 text-right font-medium"\>${formatRupiah(salesman.target)}\</td\>  
            \<td class="px-4 py-3 text-center font-bold"\>${salesman.achCallPct}%\</td\>  
            \<td class="px-4 py-3 text-center font-semibold text-gray-600"\>${salesman.achItem}\</td\>  
            \<td class="px-4 py-3 text-right font-bold text-gray-700"\>${formatRupiah(salesman.salesMtd)}\</td\>  
            \<td class="px-4 py-3 text-center"\>  
              \<span class="px-2 py-1 rounded text-\[10px\] font-bold uppercase tracking-wider ${progressBadge}"\>${salesman.achSalesPct}%\</span\>  
            \</td\>  
            \<td class="px-4 py-3 text-right font-bold text-indomarcoRed"\>${formatRupiah(salesman.kekurangan)}\</td\>  
          \`;  
          tbody.appendChild(tr);  
        });

        // Render Chart.js  
        renderChart(namesForChart, salesForChart);  
      }

      function renderChart(labels, values) {  
        const ctx \= document.getElementById('targetPieChart').getContext('2d');  
          
        if (globalChart) {  
          globalChart.destroy();  
        }

        globalChart \= new Chart(ctx, {  
          type: 'doughnut',  
          data: {  
            labels: labels,  
            datasets: \[{  
              data: values,  
              backgroundColor: \[  
                '\#0000B3', // Alvin  
                '\#E6005C', // Megi  
                '\#10B981', // Fillar  
                '\#F59E0B', // Wily  
                '\#8B5CF6', // Yogi  
                '\#3B82F6'  // Adri  
              \],  
              borderWidth: 1  
            }\]  
          },  
          options: {  
            responsive: true,  
            maintainAspectRatio: false,  
            plugins: {  
              legend: {  
                display: true,  
                position: 'bottom',  
                labels: {  
                  boxWidth: 10,  
                  font: { size: 9 }  
                }  
              }  
            }  
          }  
        });  
      }

      function formatRupiah(val) {  
        return "Rp " \+ Number(val).toLocaleString('id-ID');  
      }  
    \</script\>  
  \</body\>  
\</html\>

## **6\. LANGKAH-LANGKAH DEPLOYMENT PROSES (PRODUCTION)**

Agar aplikasi dapat berjalan langsung di area produksi PT Indomarco Adi Prima, ikuti petunjuk rilis berikut:

1. **Persiapkan Google Sheet**:  
   * Buat spreadsheet baru.  
   * Buat dua sheet masing-masing diberi nama persis: User\_Akses dan Log\_Harian.  
   * Masukkan baris kepala kolom (*Headers*) sesuai penjelasan pada **Poin 2** (Pastikan kolom terakhir di Log\_Harian adalah Sales\_MTD).  
2. **Setup Script Editor**:  
   * Pada menu atas spreadsheet, klik **Extensions** \> **Apps Script**.  
   * Hapus file kode kosong bawaan, gantikan dengan kode Kode.gs (dari **Poin 4**).  
   * Tambahkan file baru berjenis HTML, beri nama Index.html, lalu isikan kode dari **Poin 5**.  
3. **Deploy Web Application**:  
   * Klik tombol **Deploy** di pojok kanan atas \> Pilih **New Deployment**.  
   * Klik tombol roda gigi (*Select type*) \> Pilih **Web App**.  
   * Berikan nama deskripsi peluncuran (misal: "Indomarco Dashboard v1.1 \- Direct MTD").  
   * Konfigurasi hak eksekusi akses:  
     * **Execute as:** Me (your-account@gmail.com)  
     * **Who has access:** Anyone (Pilihan terbaik agar seluruh sales dengan HP pribadi dapat mengakses tanpa kendala autentikasi Google).  
   * Klik **Deploy**, izinkan otorisasi akses (*Review Permissions*), lalu salin URL Web App yang dihasilkan.

Sistem Web App Sales Dashboard kini resmi terpasang dan siap digunakan oleh tim di lapangan\!

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAaCAYAAACzdqxAAAABj0lEQVR4Xu2Uv0rDUBTGE6qgoIhKBEnbmzRCUKdS8Al0dVBBFzfBJ1BwdHQTFIeqD6Dg4OAifQInBSdxkG4O4i7453fSVPHYRJqKIPjBx035zvl67rn3Hsv6i7Bd1x02xoxmped5PdrUchynD+GcgNdisVhn3YfVFB7CS/gkOTF3pUDtbSGU4aPQ9/0prScgRyEz5NzCu3w+7+qACFS9SMALvA6CYETrScBwiJwa+Utai1CpVLpNY6uytar81jFJoPJJcvb47NJaBKlUKpbKZQdaT4GN+SBrTgvvkB43+w3LWu8E8u/rcUtqpVJpQAdkhvSXVhyLOeuG1eoqZQUtMVR+g/lzoVCY1XpHwHRejE3jASQfTLuQg5SW/Gif41acyqq1zJAKpdI2nvf3iG/EFtVOay0F6Q9ETAnY5rDmtJYG5sWYjIGW4xPYiGtC+dZiEjDtJecA01WtRYiv1k6bw2cCwwvyHuC41pvz4QquELyQRow24RGx9+Zj0J99aUMYhv0IJyTVO+DyJ9N//AreAJ2LfpQ26FY1AAAAAElFTkSuQmCC>