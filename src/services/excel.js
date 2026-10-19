const ExcelJS = require('exceljs');

const ID_MONTHS = {
  'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
  'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'agu': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
};

function parseIndonesianDate(dateStr, fallbackStr) {
  if (!dateStr && fallbackStr) {
    const d = new Date(fallbackStr);
    if (!isNaN(d.getTime())) return d;
  }
  if (!dateStr) return new Date();

  const trimmed = dateStr.trim();
  // Check ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Check "19 Oktober 2026" or "19-10-2026"
  const indMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (indMatch) {
    const day = parseInt(indMatch[1], 10);
    const monthName = indMatch[2].toLowerCase();
    const year = parseInt(indMatch[3], 10);
    const month = ID_MONTHS[monthName];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  if (fallbackStr) {
    const fb = new Date(fallbackStr);
    if (!isNaN(fb.getTime())) return fb;
  }
  return new Date();
}

function formatDateID(date) {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function generateFinancialExcel(data, pengaturan, filterInfo) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = pengaturan.nama_usaha || 'Mikayla Teknik';
  workbook.created = new Date();

  // --- SHEET 1: REKAP TRANSAKSI KEUANGAN ---
  const ws1 = workbook.addWorksheet('Laporan Keuangan', {
    pageSetup: { orientation: 'landscape', paperSize: 9 }
  });

  // Setup Columns
  ws1.columns = [
    { key: 'no', width: 6 },
    { key: 'tanggal', width: 14 },
    { key: 'nomor_surat', width: 26 },
    { key: 'jenis', width: 14 },
    { key: 'penerima', width: 28 },
    { key: 'perihal', width: 32 },
    { key: 'status', width: 14 },
    { key: 'subtotal', width: 18 },
    { key: 'nilai_ppn', width: 16 },
    { key: 'grand_total', width: 20 },
  ];

  // Header Perusahaan
  const namaUsaha = pengaturan.nama_usaha || 'MIKAYLA TEKNIK';
  const alamatUsaha = [pengaturan.alamat, pengaturan.no_hp ? `HP/WA: ${pengaturan.no_hp}` : '']
    .filter(Boolean)
    .join(' | ');

  ws1.mergeCells('A1:J1');
  const cellA1 = ws1.getCell('A1');
  cellA1.value = namaUsaha.toUpperCase();
  cellA1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFD35400' } };
  cellA1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(1).height = 24;

  ws1.mergeCells('A2:J2');
  const cellA2 = ws1.getCell('A2');
  cellA2.value = alamatUsaha;
  cellA2.font = { name: 'Calibri', size: 10, color: { argb: 'FF555555' } };
  cellA2.alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.mergeCells('A3:J3');
  const cellA3 = ws1.getCell('A3');
  cellA3.value = `LAPORAN KEUANGAN & TRANSAKSI (${filterInfo.periodeLabel || 'Semua Periode'})`;
  cellA3.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1F2937' } };
  cellA3.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(3).height = 20;

  ws1.mergeCells('A4:J4');
  const cellA4 = ws1.getCell('A4');
  cellA4.value = `Dicetak pada: ${formatDateID(new Date())} | Rentang: ${filterInfo.rentangStr || '-'}`;
  cellA4.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF777777' } };
  cellA4.alignment = { vertical: 'middle', horizontal: 'center' };

  // KPI Summary Box
  ws1.addRow([]); // Blank row at row 5
  
  const kpiRowIndex = 6;
  ws1.getRow(kpiRowIndex).height = 22;

  // Total Omzet Box
  ws1.mergeCells(`B${kpiRowIndex}:C${kpiRowIndex}`);
  const kpi1 = ws1.getCell(`B${kpiRowIndex}`);
  kpi1.value = `TOTAL OMZET: Rp ${(data.summary.total_omset || 0).toLocaleString('id-ID')}`;
  kpi1.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  kpi1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE65100' } }; // Orange
  kpi1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total Lunas Box
  ws1.mergeCells(`D${kpiRowIndex}:E${kpiRowIndex}`);
  const kpi2 = ws1.getCell(`D${kpiRowIndex}`);
  kpi2.value = `LUNAS (KAS): Rp ${(data.summary.total_lunas || 0).toLocaleString('id-ID')}`;
  kpi2.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  kpi2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }; // Green
  kpi2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Piutang Box
  ws1.mergeCells(`F${kpiRowIndex}:G${kpiRowIndex}`);
  const kpi3 = ws1.getCell(`F${kpiRowIndex}`);
  kpi3.value = `PIUTANG: Rp ${(data.summary.total_piutang || 0).toLocaleString('id-ID')}`;
  kpi3.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  kpi3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }; // Blue
  kpi3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total Pajak PPN Box
  ws1.mergeCells(`H${kpiRowIndex}:I${kpiRowIndex}`);
  const kpi4 = ws1.getCell(`H${kpiRowIndex}`);
  kpi4.value = `PPN: Rp ${(data.summary.total_ppn || 0).toLocaleString('id-ID')}`;
  kpi4.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  kpi4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6A1B9A' } }; // Purple
  kpi4.alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.addRow([]); // Blank row 7

  // Table Header at Row 8
  const headerRow = ws1.addRow([
    'NO',
    'TANGGAL',
    'NO. SURAT / NOTA',
    'JENIS',
    'PENERIMA / KLIEN',
    'PERIHAL',
    'STATUS',
    'SUBTOTAL (RP)',
    'PPN (RP)',
    'GRAND TOTAL (RP)'
  ]);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE65100' } // Theme Orange
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });

  // Table Data Rows
  let startDataRow = 9;
  let currentRow = startDataRow;

  data.transaksi.forEach((item, index) => {
    const row = ws1.addRow([
      index + 1,
      item.tanggal || formatDateID(item.dibuat_pada),
      item.nomor_surat,
      item.jenis ? item.jenis.toUpperCase() : 'NOTA',
      item.penerima_nama,
      item.perihal || '-',
      item.status || 'Draft',
      Number(item.subtotal) || 0,
      Number(item.nilai_ppn) || 0,
      Number(item.grand_total) || 0
    ]);
    row.height = 20;

    // Zebra striping
    const isEven = index % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFFDF8F3'; // Light warm orange-white

    row.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };

      // Alignment and formats
      if (colNumber === 1 || colNumber === 2 || colNumber === 4 || colNumber === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber >= 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Status color highlighting
      if (colNumber === 7) {
        if (cell.value === 'Lunas') {
          cell.font = { bold: true, color: { argb: 'FF2E7D32' } };
        } else if (cell.value === 'Disetujui' || cell.value === 'Terkirim') {
          cell.font = { bold: true, color: { argb: 'FF1565C0' } };
        } else if (cell.value === 'Draft') {
          cell.font = { color: { argb: 'FFE65100' } };
        } else if (cell.value === 'Ditolak') {
          cell.font = { color: { argb: 'FFC62828' } };
        }
      }
    });

    currentRow++;
  });

  // Total Row at Bottom
  if (data.transaksi.length > 0) {
    const totalRow = ws1.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTAL:',
      { formula: `SUM(H${startDataRow}:H${currentRow - 1})` },
      { formula: `SUM(I${startDataRow}:I${currentRow - 1})` },
      { formula: `SUM(J${startDataRow}:J${currentRow - 1})` }
    ]);
    totalRow.height = 24;

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE0B2' } // Light orange accent
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFE65100' } },
        bottom: { style: 'double', color: { argb: 'FFE65100' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };

      if (colNumber >= 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  }

  // --- SHEET 2: DETAIL ITEM BARANG / JASA ---
  const ws2 = workbook.addWorksheet('Rincian Item Nota', {
    pageSetup: { orientation: 'portrait', paperSize: 9 }
  });

  ws2.columns = [
    { key: 'no', width: 6 },
    { key: 'nomor_surat', width: 26 },
    { key: 'tanggal', width: 14 },
    { key: 'penerima', width: 26 },
    { key: 'nama_barang', width: 34 },
    { key: 'qty', width: 10 },
    { key: 'satuan', width: 12 },
    { key: 'harga_satuan', width: 18 },
    { key: 'subtotal', width: 20 },
  ];

  const headerRow2 = ws2.addRow([
    'NO',
    'NO. NOTA',
    'TANGGAL',
    'PENERIMA',
    'NAMA BARANG / JASA',
    'QTY',
    'SATUAN',
    'HARGA SATUAN (RP)',
    'SUBTOTAL (RP)'
  ]);
  headerRow2.height = 24;

  headerRow2.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD35400' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });

  let itemIdx = 1;
  const startItemRow = 2;
  let currentItemRow = startItemRow;

  data.transaksi.forEach((nota) => {
    if (nota.items && nota.items.length > 0) {
      nota.items.forEach((it) => {
        const r = ws2.addRow([
          itemIdx++,
          nota.nomor_surat,
          nota.tanggal || formatDateID(nota.dibuat_pada),
          nota.penerima_nama,
          it.nama_barang,
          Number(it.qty) || 1,
          it.satuan || 'Unit',
          Number(it.harga_satuan) || 0,
          Number(it.subtotal) || 0
        ]);
        r.height = 20;

        r.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };
          if (colNumber === 1 || colNumber === 3 || colNumber === 6 || colNumber === 7) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber >= 8) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
        currentItemRow++;
      });
    }
  });

  if (itemIdx > 1) {
    const totalItemRow = ws2.addRow([
      '', '', '', '', '', '', '', 'TOTAL ITEM:',
      { formula: `SUM(I${startItemRow}:I${currentItemRow - 1})` }
    ]);
    totalItemRow.height = 24;
    totalItemRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFE65100' } },
        bottom: { style: 'double', color: { argb: 'FFE65100' } }
      };
      if (colNumber === 9) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  }

  return workbook;
}

module.exports = {
  generateFinancialExcel,
  parseIndonesianDate,
  formatDateID
};
