/**
 * Indomarco Sales Dashboard Web App - Backend (Kode.gs)
 * 
 * Skenario Deployment:
 * 1. Tempel kode ini di Google Apps Script editor.
 * 2. Jalankan fungsi 'initDatabase' sekali untuk membuat tabel & data demo secara otomatis.
 * 3. Deploy sebagai Web App (Execute as: Me, Who has access: Anyone).
 * 4. Salin URL Web App yang dihasilkan dan tempel ke 'API_URL' di berkas frontend index.html.
 */

/**
 * Inisialisasi Database Google Sheets secara otomatis.
 * Membuat tab 'User_Akses' dan 'Log_Harian' lengkap dengan data contoh.
 */
function initDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Sheet: User_Akses
  var userSheet = ss.getSheetByName("User_Akses");
  if (!userSheet) {
    userSheet = ss.insertSheet("User_Akses");
  }
  userSheet.clear();
  
  var userHeaders = ["Username", "Password", "Nama", "Role", "SPOINT", "Target_Juni", "Target_Juli"];
  userSheet.appendRow(userHeaders);
  
  var sampleUsers = [
    ["panji", "spv123", "Panji Anugrah", "supervisor", "All Area", 7512758571, 7800000000],
    ["alvin", "sales123", "ALVIN MAYROSSA", "sales", "SP PASAMAN BARAT", 1469308620, 1500000000],
    ["wily", "sales123", "WILY MAIZA ROYAN", "sales", "SP LUHAK NAN DUO", 1369112989, 1400000000],
    ["yogi", "sales123", "YOGI PRATAMA", "sales", "SP LUHAK NAN DUO", 653276899, 700000000],
    ["fillar", "sales123", "FILLAR", "sales", "SP LEMBAH MELINTANG", 1398559363, 1450000000],
    ["megi", "sales123", "MEGI VEVIALDY", "sales", "SP LEMBAH MELINTANG", 1261208254, 1300000000],
    ["adri", "sales123", "ADRI ANDIKA", "sales", "SP AIR BANGIS", 1361292446, 1400000000]
  ];
  userSheet.getRange(2, 1, sampleUsers.length, sampleUsers[0].length).setValues(sampleUsers);
  
  // Format Target columns as Currency
  userSheet.getRange("F2:G8").setNumberFormat("[$Rp-421]#,##0");

  // 2. Setup Sheet: Log_Harian
  var logSheet = ss.getSheetByName("Log_Harian");
  if (!logSheet) {
    logSheet = ss.insertSheet("Log_Harian");
  }
  logSheet.clear();
  
  var logHeaders = ["Timestamp", "Nama_Sales", "SPOINT", "Call", "Eff_Call", "SKU_Item", "Sales_MTD"];
  logSheet.appendRow(logHeaders);
  
  // Menambahkan log contoh untuk menguji filter bulan (sebagian data Juni, sebagian data Juli)
  var sampleLogs = [
    // Data Juni
    [new Date("2026-06-25T08:00:00Z"), "ALVIN MAYROSSA", "SP PASAMAN BARAT", 30, 20, 120, 1400000000],
    [new Date("2026-06-25T09:00:00Z"), "MEGI VEVIALDY", "SP LEMBAH MELINTANG", 28, 18, 90, 1100000000],
    // Data Juli (Bulan Berjalan)
    [new Date("2026-07-09T10:00:00Z"), "ALVIN MAYROSSA", "SP PASAMAN BARAT", 35, 25, 150, 800000000],
    [new Date("2026-07-09T11:00:00Z"), "MEGI VEVIALDY", "SP LEMBAH MELINTANG", 32, 22, 110, 750000000],
    [new Date("2026-07-10T14:30:00Z"), "ALVIN MAYROSSA", "SP PASAMAN BARAT", 36, 26, 160, 950000000], // MTD naik
    [new Date("2026-07-10T15:00:00Z"), "MEGI VEVIALDY", "SP LEMBAH MELINTANG", 30, 18, 95, 820000000]   // MTD naik
  ];
  
  for (var i = 0; i < sampleLogs.length; i++) {
    logSheet.appendRow(sampleLogs[i]);
  }
  
  // Format Timestamp and Currency in Log_Harian
  logSheet.getRange(2, 1, sampleLogs.length, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
  logSheet.getRange(2, 7, sampleLogs.length, 1).setNumberFormat("[$Rp-421]#,##0");
  
  Logger.log("Database berhasil diinisialisasi!");
}

/**
 * Handle POST request from external client. 
 * Menyediakan router terpusat dengan dukungan CORS.
 */
function doPost(e) {
  var originResponse = "";
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var result = { success: false, message: "Aksi tidak dikenali." };
    
    if (action === "login") {
      result = checkLogin(params.username, params.password, params.selectedMonthIndex);
    } else if (action === "getPerformance") {
      result = getPerformanceData(params.username, params.password, params.selectedMonthIndex);
    } else if (action === "saveLog") {
      result = saveDailyLog(params.username, params.password, params.salesData);
    }
    
    originResponse = JSON.stringify(result);
  } catch (error) {
    originResponse = JSON.stringify({ success: false, message: "Kesalahan server: " + error.toString() });
  }
  
  return ContentService.createTextOutput(originResponse)
                       .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fungsi pembantu untuk memvalidasi kredensial pengguna di setiap transaksi.
 */
function validateCredentials(username, password) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("User_Akses");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim().toLowerCase() === username.trim().toLowerCase() && 
        data[i][1].toString().trim() === password.trim()) {
      return {
        valid: true,
        username: data[i][0],
        nama: data[i][2],
        role: data[i][3],
        spoint: data[i][4],
        rowData: data[i], // Menyimpan seluruh data baris user
        headers: data[0]  // Menyimpan header untuk resolusi kolom target
      };
    }
  }
  return { valid: false };
}

/**
 * Validasi login user.
 */
function checkLogin(username, password, selectedMonthIndex) {
  var creds = validateCredentials(username, password);
  if (creds.valid) {
    var currentMtd = 0;
    var target = 0;
    var totalCall = 0;
    var totalEffCall = 0;
    var totalSku = 0;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentDate = new Date();
    var filterDate = currentDate;
    
    if (selectedMonthIndex !== undefined && selectedMonthIndex !== null && selectedMonthIndex !== "") {
      filterDate = new Date(currentDate.getFullYear(), Number(selectedMonthIndex), 1);
    }
    
    var workingDaysLeft = getWorkingDaysLeftForFilter(currentDate.getFullYear(), filterDate.getMonth());
    var targetColInfo = getActiveTargetColumn(creds.headers, filterDate);
    
    if (targetColInfo) {
      target = safeParseNumber(creds.rowData[targetColInfo.index]);
      var filterMonthIndex = targetColInfo.monthIndex;
      var currentYear = filterDate.getFullYear();
      
      if (creds.role === "sales") {
        try {
          var logSheet = ss.getSheetByName("Log_Harian");
          var logs = logSheet.getDataRange().getValues();
          
          var latestMtdTime = null;
          for (var j = 1; j < logs.length; j++) {
            var logTimestamp = new Date(logs[j][0]);
            var logSalesName = logs[j][1];
            
            if (logSalesName === creds.nama && 
                logTimestamp.getMonth() === filterMonthIndex && 
                logTimestamp.getFullYear() === currentYear) {
              
              var rawCall = logs[j][3];
              var rawEffCall = logs[j][4];
              var rawSku = logs[j][5];
              var rawSalesMtd = logs[j][6];
              
              // Abaikan baris kosong (template pre-populate)
              if (rawCall === "" && rawEffCall === "" && rawSalesMtd === "") {
                continue;
              }
              
              // Akumulasikan aktivitas bulanan
              totalCall += safeParseNumber(rawCall);
              totalEffCall += safeParseNumber(rawEffCall);
              totalSku += safeParseNumber(rawSku);
              
              // Catat salesMtd terbaru berdasarkan urutan tanggal kronologis
              if (rawSalesMtd !== "") {
                if (!latestMtdTime || logTimestamp >= latestMtdTime) {
                  latestMtdTime = logTimestamp;
                  currentMtd = safeParseNumber(rawSalesMtd);
                }
              }
            }
          }
        } catch (e) {
          // Abaikan jika sheet kosong atau error
        }
      }
    }
    
    // Dapatkan daftar bulan target yang tersedia dari header
    var availableMonths = [];
    var monthNamesMap = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    var headers = creds.headers;
    for (var h = 0; h < headers.length; h++) {
      var headerStr = headers[h].toString().trim();
      if (headerStr.toLowerCase().indexOf("target_") === 0) {
        var cleanMonthName = headerStr.replace(/target_/i, "");
        var foundIndex = -1;
        for (var m = 0; m < monthNamesMap.length; m++) {
          if (monthNamesMap[m].toLowerCase() === cleanMonthName.toLowerCase()) {
            foundIndex = m;
            break;
          }
        }
        if (foundIndex !== -1) {
          availableMonths.push({
            name: monthNamesMap[foundIndex],
            index: foundIndex
          });
        }
      }
    }
    
    return {
      success: true,
      username: creds.username,
      nama: creds.nama,
      role: creds.role,
      spoint: creds.spoint,
      currentMtd: currentMtd,
      target: target,
      totalCall: totalCall,
      totalEffCall: totalEffCall,
      totalSku: totalSku,
      workingDaysLeft: workingDaysLeft,
      availableMonths: availableMonths,
      activeMonthIndex: targetColInfo ? targetColInfo.monthIndex : currentDate.getMonth(),
      activeMonthName: targetColInfo ? targetColInfo.name.replace("Target_", "") : monthNamesMap[currentDate.getMonth()]
    };
  } else {
    return { success: false, message: "Username atau password salah!" };
  }
}

/**
 * Mendapatkan kolom target bulanan yang aktif berdasarkan bulan saat ini.
 */
function getActiveTargetColumn(headers, currentDate) {
  var monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var currentMonthName = monthNames[currentDate.getMonth()].toLowerCase(); // Contoh: "juli"
  var fallbackColIdx = -1;
  
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].toString().trim().toLowerCase();
    if (header.indexOf("target_") === 0) {
      if (fallbackColIdx === -1) {
        fallbackColIdx = i; // Kolom target pertama sebagai cadangan
      }
      if (header.indexOf(currentMonthName) !== -1) {
        return { index: i, name: headers[i], monthIndex: currentDate.getMonth() };
      }
    }
  }
  
  // Jika tidak ada kolom target yang cocok dengan bulan berjalan, gunakan kolom target pertama
  if (fallbackColIdx !== -1) {
    var headerName = headers[fallbackColIdx].toString();
    var monthIndex = currentDate.getMonth(); // Default bulan berjalan
    for (var m = 0; m < monthNames.length; m++) {
      if (headerName.toLowerCase().indexOf(monthNames[m].toLowerCase()) !== -1) {
        monthIndex = m;
        break;
      }
    }
    return { index: fallbackColIdx, name: headerName, monthIndex: monthIndex };
  }
  
  return null;
}

/**
 * Menyimpan log harian transaksi sales dengan proteksi validasi penurunan MTD.
 */
function saveDailyLog(username, password, salesData) {
  try {
    var creds = validateCredentials(username, password);
    if (!creds.valid || creds.role !== "sales") {
      return { success: false, message: "Akses ditolak. Otentikasi sales gagal." };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName("Log_Harian");
    var logs = logSheet.getDataRange().getValues();
    
    // Tentukan tanggal log (Hari Ini vs Kemarin)
    var logDate = new Date();
    if (salesData.dateType === "yesterday") {
      logDate.setDate(logDate.getDate() - 1);
    }
    
    var targetColInfo = getActiveTargetColumn(creds.headers, logDate);
    var filterMonthIndex = targetColInfo ? targetColInfo.monthIndex : logDate.getMonth();
    var currentYear = logDate.getFullYear();
    
    var newSalesMtd = safeParseNumber(salesData.salesMtd);
    var lastRecordedMtd = 0;
    
    // Cari entri terakhir sales terkait pada bulan aktif target
    for (var j = logs.length - 1; j >= 1; j--) {
      var logTimestamp = new Date(logs[j][0]);
      var logSalesName = logs[j][1];
      
      if (logSalesName === creds.nama && 
          logTimestamp.getMonth() === filterMonthIndex && 
          logTimestamp.getFullYear() === currentYear) {
        var rawSalesMtd = logs[j][6];
        if (rawSalesMtd !== "") {
          lastRecordedMtd = safeParseNumber(rawSalesMtd);
          break; // Ditemukan log terbaru dengan nilai MTD valid
        }
      }
    }
    
    // Validasi Celah Kritis 3: Mencegah penurunan nilai MTD
    if (newSalesMtd < lastRecordedMtd) {
      return { 
        success: false, 
        message: "Kesalahan Input: Nilai Sales MTD baru (Rp " + newSalesMtd.toLocaleString('id-ID') + 
                 ") tidak boleh lebih kecil dari nilai MTD laporan sebelumnya bulan ini (Rp " + 
                 lastRecordedMtd.toLocaleString('id-ID') + ")." 
      };
    }
    
    // Simpan Baris Baru ke Log_Harian
    logSheet.appendRow([
      logDate,
      creds.nama,
      creds.spoint,
      safeParseNumber(salesData.call),
      safeParseNumber(salesData.effCall),
      safeParseNumber(salesData.skuItem),
      newSalesMtd
    ]);
    
    return { success: true, message: "Laporan real-time MTD berhasil disimpan!" };
  } catch (error) {
    return { success: false, message: "Gagal menyimpan data: " + error.toString() };
  }
}

/**
 * Menghitung pencapaian kinerja MTD tim terfilter bulan berjalan bebas eror pembagian nol.
 * Hanya bisa diakses oleh supervisor.
 */
function getPerformanceData(username, password, selectedMonthIndex) {
  try {
    var creds = validateCredentials(username, password);
    if (!creds.valid || creds.role !== "supervisor") {
      return { success: false, message: "Akses ditolak. Hak akses supervisor diperlukan." };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var userSheet = ss.getSheetByName("User_Akses");
    var logSheet = ss.getSheetByName("Log_Harian");
    
    var users = userSheet.getDataRange().getValues();
    var logs = logSheet.getDataRange().getValues();
    
    var currentDate = new Date();
    var filterDate = currentDate;
    
    // Jika supervisor memilih bulan tertentu, buat filterDate berdasarkan bulan tersebut
    if (selectedMonthIndex !== undefined && selectedMonthIndex !== null && selectedMonthIndex !== "") {
      filterDate = new Date(currentDate.getFullYear(), Number(selectedMonthIndex), 1);
    }
    
    var headers = users[0];
    var targetColInfo = getActiveTargetColumn(headers, filterDate);
    
    if (!targetColInfo) {
      return { success: false, message: "Struktur kolom target tidak ditemukan di tabel User_Akses." };
    }
    
    var targetColIndex = targetColInfo.index;
    var filterMonthIndex = targetColInfo.monthIndex; // Bulan filter
    var filterYear = filterDate.getFullYear();
    
    // Dapatkan semua daftar bulan target yang tersedia di header User_Akses secara dinamis
    var availableMonths = [];
    var monthNamesMap = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    for (var h = 0; h < headers.length; h++) {
      var headerStr = headers[h].toString().trim();
      if (headerStr.toLowerCase().indexOf("target_") === 0) {
        var cleanMonthName = headerStr.replace(/target_/i, "");
        var foundIndex = -1;
        for (var m = 0; m < monthNamesMap.length; m++) {
          if (cleanMonthName.toLowerCase() === monthNamesMap[m].toLowerCase()) {
            foundIndex = m;
            break;
          }
        }
        if (foundIndex !== -1) {
          availableMonths.push({
            name: monthNamesMap[foundIndex],
            index: foundIndex
          });
        }
      }
    }
    
    var salesMetrics = {};
    
    // Inisialisasi daftar sales aktif beserta target bulan terpilih
    for (var i = 1; i < users.length; i++) {
      var name = users[i][2];
      var role = users[i][3];
      var spoint = users[i][4];
      var target = safeParseNumber(users[i][targetColIndex]);
      
      if (role === "sales") {
        salesMetrics[name] = {
          nama: name,
          spoint: spoint,
          target: target,
          totalCall: 0,
          totalEffCall: 0,
          totalSku: 0,
          salesMtd: 0,
          latestLogTime: null,
          logsCount: 0
        };
      }
    }
    
    var rawLogsInMonth = [];
    
    // Proses logs transaksi log harian (Filter: Hanya bulan & tahun terpilih)
    for (var j = 1; j < logs.length; j++) {
      var logTimestamp = new Date(logs[j][0]);
      var salesmanName = logs[j][1];
      
      // Filter berdasarkan bulan target dan tahun terpilih
      if (logTimestamp.getMonth() === filterMonthIndex && 
          logTimestamp.getFullYear() === filterYear && 
          salesMetrics[salesmanName]) {
            
        var rawCall = logs[j][3];
        var rawEffCall = logs[j][4];
        var rawSku = logs[j][5];
        var rawSalesMtd = logs[j][6];
        
        // JIKA BARIS INI KOSONG (misal baris pre-populate template), ABAIKAN!
        if (rawCall === "" && rawEffCall === "" && rawSalesMtd === "") {
          continue;
        }
        
        salesMetrics[salesmanName].totalCall += safeParseNumber(rawCall);
        salesMetrics[salesmanName].totalEffCall += safeParseNumber(rawEffCall);
        salesMetrics[salesmanName].totalSku += safeParseNumber(rawSku);
        
        // Selalu perbarui ke entri MTD terbaru berdasarkan urutan tanggal kronologis (bukan sekadar indeks baris)
        if (rawSalesMtd !== "") {
          if (!salesMetrics[salesmanName].latestLogTime || logTimestamp >= salesMetrics[salesmanName].latestLogTime) {
            salesMetrics[salesmanName].latestLogTime = logTimestamp;
            salesMetrics[salesmanName].salesMtd = safeParseNumber(rawSalesMtd);
          }
        }
        salesMetrics[salesmanName].logsCount += 1;
        
        // Simpan log mentah untuk disalurkan ke frontend (hanya jika ada data valid)
        rawLogsInMonth.push({
          timestamp: logTimestamp.toISOString(),
          nama: salesmanName,
          call: safeParseNumber(rawCall),
          effCall: safeParseNumber(rawEffCall),
          sku: safeParseNumber(rawSku),
          salesMtd: safeParseNumber(rawSalesMtd)
        });
      }
    }
    
    var dashboardList = [];
    var totalTargetArea = 0;
    var totalSalesArea = 0;
    var totalCallArea = 0;
    var totalEffCallArea = 0;
    var totalSkuArea = 0;
    
    for (var key in salesMetrics) {
      var s = salesMetrics[key];
      
      // Safe division pembagian nol
      var achCallPct = s.totalCall > 0 ? Math.round((s.totalEffCall / s.totalCall) * 100) : 0;
      var achSalesPct = s.target > 0 ? Math.round((s.salesMtd / s.target) * 100) : 0;
      var achItem = s.totalEffCall > 0 ? Number((s.totalSku / s.totalEffCall).toFixed(1)) : 0;
      var kekurangan = s.target - s.salesMtd;
      if (kekurangan < 0) kekurangan = 0;
      
      totalTargetArea += s.target;
      totalSalesArea += s.salesMtd;
      totalCallArea += s.totalCall;
      totalEffCallArea += s.totalEffCall;
      totalSkuArea += s.totalSku;
      
      dashboardList.push({
        nama: s.nama,
        spoint: s.spoint,
        target: s.target,
        totalCall: s.totalCall,
        totalEffCall: s.totalEffCall,
        totalSku: s.totalSku,
        achCallPct: achCallPct,
        achItem: achItem,
        salesMtd: s.salesMtd,
        achSalesPct: achSalesPct,
        kekurangan: kekurangan
      });
    }
    
    // Urutkan performa berdasarkan persentase pencapaian salesMtd tertinggi
    dashboardList.sort(function(a, b) { return b.achSalesPct - a.achSalesPct; });
    
    var areaAchCallPct = totalCallArea > 0 ? Math.round((totalEffCallArea / totalCallArea) * 100) : 0;
    var areaAchSalesPct = totalTargetArea > 0 ? Math.round((totalSalesArea / totalTargetArea) * 100) : 0;
    var areaKekurangan = totalTargetArea - totalSalesArea;
    if (areaKekurangan < 0) areaKekurangan = 0;
    
    return {
      success: true,
      activeMonthName: targetColInfo.name.replace("Target_", ""),
      activeMonthIndex: filterMonthIndex,
      workingDaysLeft: getWorkingDaysLeftForFilter(filterYear, filterMonthIndex),
      salesList: dashboardList,
      availableMonths: availableMonths,
      rawLogs: rawLogsInMonth,
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
    return { success: false, message: "Gagal memuat dashboard: " + error.toString() };
  }
}

/**
 * Menghitung sisa hari kerja (Senin - Jumat) dari hari ini hingga akhir bulan terpilih.
 * Jika bulan sudah berlalu, sisa hari kerja adalah 0.
 * Jika bulan di masa depan, hitung total hari kerja Senin-Jumat di bulan tersebut.
 */
function getWorkingDaysLeftForFilter(year, monthIndex) {
  var today = new Date();
  var currentYear = today.getFullYear();
  var currentMonth = today.getMonth();
  
  if (year < currentYear || (year === currentYear && monthIndex < currentMonth)) {
    return 0; // Bulan lalu sudah selesai
  }
  
  var startDay = 1;
  if (year === currentYear && monthIndex === currentMonth) {
    startDay = today.getDate(); // Bulan berjalan: hitung dari hari ini
  }
  
  var lastDay = new Date(year, monthIndex + 1, 0).getDate();
  var workingDaysLeft = 0;
  for (var d = startDay; d <= lastDay; d++) {
    var date = new Date(year, monthIndex, d);
    var day = date.getDay();
    if (day >= 1 && day <= 5) {
      workingDaysLeft++;
    }
  }
  return Math.max(1, workingDaysLeft); // Minimalkan 1 untuk prevent division by zero
}

/**
 * Menghitung sisa hari kerja (Senin - Jumat) dari hari ini hingga akhir bulan berjalan.
 */
function getWorkingDaysLeft() {
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth(); // 0-11
  
  // Dapatkan hari terakhir dari bulan berjalan
  var lastDay = new Date(year, month + 1, 0).getDate();
  
  var workingDaysLeft = 0;
  for (var d = today.getDate(); d <= lastDay; d++) {
    var date = new Date(year, month, d);
    var day = date.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    if (day >= 1 && day <= 5) { // Hanya Senin - Jumat (Sabtu & Minggu libur)
      workingDaysLeft++;
    }
  }
  return Math.max(1, workingDaysLeft); // Hindari pembagian dengan nol
}

/**
 * Parsing angka dari spreadsheet secara aman, mendukung format mata uang Rupiah dan pemisah ribuan titik/koma.
 */
function safeParseNumber(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === 'number') return val;
  
  // Hapus lambang Rp, spasi, dan karakter non-numeric lainnya kecuali angka, koma, titik, minus
  var cleanStr = val.toString().replace(/[^0-9,\.-]/g, '').trim();
  
  // Kasus format rupiah Indonesia: 15.000.000 atau 15.000.000,50
  if (cleanStr.indexOf('.') !== -1 && cleanStr.indexOf(',') !== -1) {
    // Koma adalah desimal, titik adalah ribuan
    cleanStr = cleanStr.replace(/\./g, '').replace(/,/g, '.');
  } else if (cleanStr.indexOf('.') !== -1) {
    // Hanya ada titik. Di Indonesia biasanya pemisah ribuan (e.g. 15.000)
    var parts = cleanStr.split('.');
    var isRibuan = true;
    for (var i = 1; i < parts.length; i++) {
      if (parts[i].length !== 3) {
        isRibuan = false;
        break;
      }
    }
    if (isRibuan) {
      cleanStr = cleanStr.replace(/\./g, '');
    }
  } else if (cleanStr.indexOf(',') !== -1) {
    // Hanya ada koma. Desimal koma -> ganti koma dengan titik.
    var parts = cleanStr.split(',');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      cleanStr = cleanStr.replace(/,/g, '');
    } else {
      cleanStr = cleanStr.replace(/,/g, '.');
    }
  }
  
  var parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Fungsi pembantu untuk menguji struktur kolom dan baris data di sheet Log_Harian.
 * Silakan pilih fungsi ini di editor Google Apps Script dan klik Run untuk melihat log.
 */
function debugLogHarian() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("Log_Harian");
  if (!logSheet) {
    Logger.log("ERROR: Sheet dengan nama 'Log_Harian' tidak ditemukan!");
    return;
  }
  
  var values = logSheet.getDataRange().getValues();
  Logger.log("================ DEBUG LOG HARIAN ================");
  Logger.log("Total baris data: " + values.length);
  
  if (values.length > 0) {
    Logger.log("Header Kolom (Baris 1): " + JSON.stringify(values[0]));
    Logger.log("Jumlah Kolom Terdeteksi: " + values[0].length);
  }
  
  if (values.length > 1) {
    Logger.log("Baris Data Pertama (Baris 2): " + JSON.stringify(values[1]));
    Logger.log("Baris Data Terakhir (Baris " + values.length + "): " + JSON.stringify(values[values.length - 1]));
  }
  Logger.log("==================================================");
}
