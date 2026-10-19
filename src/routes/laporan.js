const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateFinancialExcel, parseIndonesianDate, formatDateID } = require('../services/excel');

// Helper to determine start and end Date for a given filter
function getDateRange(periode, customDari, customSampai) {
  const now = new Date();
  let start = null;
  let end = null;
  let label = 'Semua Data';

  switch (periode) {
    case 'hari_ini': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = 'Hari Ini (' + formatDateID(start) + ')';
      break;
    }
    case 'minggu_ini': {
      // Start of week (Monday)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      label = 'Minggu Ini (' + formatDateID(start) + ' - ' + formatDateID(end) + ')';
      break;
    }
    case 'bulan_ini': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      label = 'Bulan Ini (' + monthNames[now.getMonth()] + ' ' + now.getFullYear() + ')';
      break;
    }
    case 'tahun_ini': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = 'Tahun Ini (' + now.getFullYear() + ')';
      break;
    }
    case 'rentang': {
      if (customDari) {
        start = new Date(customDari);
        start.setHours(0, 0, 0, 0);
      }
      if (customSampai) {
        end = new Date(customSampai);
        end.setHours(23, 59, 59, 999);
      }
      label = 'Rentang (' + (start ? formatDateID(start) : 'Awal') + ' - ' + (end ? formatDateID(end) : 'Sekarang') + ')';
      break;
    }
    default:
      label = 'Semua Periode';
      break;
  }

  return { start, end, label };
}

// Function to fetch and filter transactions
async function getFilteredFinancialData(periode, customDari, customSampai, filterStatus) {
  const { start, end, label } = getDateRange(periode, customDari, customSampai);

  let sql = `SELECT * FROM nota WHERE 1=1`;
  const params = [];

  if (filterStatus && filterStatus !== 'Semua') {
    sql += ` AND status = ?`;
    params.push(filterStatus);
  }

  sql += ` ORDER BY id DESC`;
  const allNotas = await db.allAsync(sql, params);

  // Filter in-memory by parsed date
  const filteredNotas = allNotas.filter((n) => {
    const notaDate = parseIndonesianDate(n.tanggal, n.dibuat_pada);
    if (start && notaDate < start) return false;
    if (end && notaDate > end) return false;
    return true;
  });

  // Attach items to each nota
  for (const n of filteredNotas) {
    n.items = await db.allAsync(`SELECT * FROM nota_item WHERE nota_id = ? ORDER BY id ASC`, [n.id]);
  }

  // Calculate summaries
  let totalOmset = 0;
  let totalLunas = 0;
  let totalPiutang = 0;
  let totalDraft = 0;
  let totalPpn = 0;
  let totalSubtotal = 0;

  let jumlahLunas = 0;
  let jumlahPiutang = 0;
  let jumlahDraft = 0;

  const statusCount = {
    Draft: 0,
    Terkirim: 0,
    Disetujui: 0,
    Lunas: 0,
    Ditolak: 0
  };

  filteredNotas.forEach((n) => {
    const grandTotal = Number(n.grand_total) || 0;
    const subtotal = Number(n.subtotal) || 0;
    const nilaiPpn = Number(n.nilai_ppn) || 0;

    totalOmset += grandTotal;
    totalSubtotal += subtotal;
    totalPpn += nilaiPpn;

    if (statusCount[n.status] !== undefined) {
      statusCount[n.status]++;
    }

    if (n.status === 'Lunas') {
      totalLunas += grandTotal;
      jumlahLunas++;
    } else if (n.status === 'Disetujui' || n.status === 'Terkirim') {
      totalPiutang += grandTotal;
      jumlahPiutang++;
    } else if (n.status === 'Draft') {
      totalDraft += grandTotal;
      jumlahDraft++;
    }
  });

  // Group data for Charts (tren omset)
  // Determine grouping: by month if 'tahun_ini', by day if 'bulan_ini' or 'minggu_ini' or 'rentang'
  const chartMap = {};

  if (periode === 'tahun_ini') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    months.forEach((m) => { chartMap[m] = 0; });

    filteredNotas.forEach((n) => {
      const d = parseIndonesianDate(n.tanggal, n.dibuat_pada);
      const mName = months[d.getMonth()];
      chartMap[mName] = (chartMap[mName] || 0) + (Number(n.grand_total) || 0);
    });
  } else if (periode === 'minggu_ini') {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    days.forEach((d) => { chartMap[d] = 0; });

    filteredNotas.forEach((n) => {
      const d = parseIndonesianDate(n.tanggal, n.dibuat_pada);
      const dayIdx = d.getDay();
      const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1; // 0=Senin, 6=Minggu
      const dayName = days[mappedIdx];
      chartMap[dayName] = (chartMap[dayName] || 0) + (Number(n.grand_total) || 0);
    });
  } else {
    // Group by Date formatted 'DD/MM'
    filteredNotas.forEach((n) => {
      const d = parseIndonesianDate(n.tanggal, n.dibuat_pada);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      chartMap[key] = (chartMap[key] || 0) + (Number(n.grand_total) || 0);
    });
  }

  const chartData = Object.keys(chartMap).map((k) => ({
    label: k,
    total: chartMap[k]
  }));

  const rentangStr = `${start ? formatDateID(start) : '-'} s/d ${end ? formatDateID(end) : '-'}`;

  return {
    periodeLabel: label,
    rentangStr,
    summary: {
      total_omset: totalOmset,
      total_lunas: totalLunas,
      total_piutang: totalPiutang,
      total_draft: totalDraft,
      total_ppn: totalPpn,
      total_subtotal: totalSubtotal,
      jumlah_transaksi: filteredNotas.length,
      jumlah_lunas: jumlahLunas,
      jumlah_piutang: jumlahPiutang,
      jumlah_draft: jumlahDraft
    },
    status_breakdown: statusCount,
    grafik: chartData,
    transaksi: filteredNotas
  };
}

// GET /api/laporan/ringkasan
router.get('/ringkasan', authenticateToken, async (req, res) => {
  try {
    const { periode, dari, sampai, status } = req.query;
    const result = await getFilteredFinancialData(periode || 'bulan_ini', dari, sampai, status);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error fetching ringkasan laporan:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/laporan/export-excel
// Can accept token in Authorization header OR in ?token= query param for easy file download
router.get('/export-excel', async (req, res) => {
  try {
    let token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    }

    // Verify token
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(403).json({ success: false, message: 'Token tidak valid atau kedaluwarsa.' });
    }

    const { periode, dari, sampai, status } = req.query;
    const reportData = await getFilteredFinancialData(periode || 'semua', dari, sampai, status);
    const pengaturan = await db.getAsync(`SELECT * FROM pengaturan_perusahaan LIMIT 1`) || {};

    const workbook = await generateFinancialExcel(reportData, pengaturan, {
      periodeLabel: reportData.periodeLabel,
      rentangStr: reportData.rentangStr
    });

    const safePeriode = (periode || 'laporan').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Laporan_Keuangan_${safePeriode}_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating Excel:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

module.exports = router;
