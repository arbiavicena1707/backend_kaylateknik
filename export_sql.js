const fs = require('fs');
const path = require('path');
const { db } = require('./src/db');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  const str = String(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return char;
    }
  });
  return `'${str}'`;
}

async function exportSql() {
  console.log('Mengekstrak data dari SQLite...');

  let sql = `-- ========================================================
-- Database Schema & Data untuk phpMyAdmin / MySQL (Mikayla Teknik)
-- Dibuat Otomatis dari SQLite
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- --------------------------------------------------------
-- Table structure for \`pengguna\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`pengguna\`;
CREATE TABLE \`pengguna\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`username\` VARCHAR(100) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`nama\` VARCHAR(150) NOT NULL,
  \`role\` VARCHAR(50) DEFAULT 'owner',
  \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`pengaturan_perusahaan\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`pengaturan_perusahaan\`;
CREATE TABLE \`pengaturan_perusahaan\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nama_usaha\` VARCHAR(200) NOT NULL,
  \`alamat\` TEXT,
  \`no_hp\` VARCHAR(50),
  \`email\` VARCHAR(100),
  \`logo_path\` VARCHAR(255),
  \`logo_standar_path\` VARCHAR(255),
  \`nama_bank\` VARCHAR(100),
  \`nama_rekening\` VARCHAR(100),
  \`no_rekening\` VARCHAR(100),
  \`nama_penanda_tangan\` VARCHAR(100),
  \`jabatan_penanda_tangan\` VARCHAR(100),
  \`ttd_path\` VARCHAR(255),
  \`tarif_ppn_default\` DECIMAL(5,2) DEFAULT 11.00,
  \`format_nomor_surat\` VARCHAR(100) DEFAULT '{NOMOR} / MK / {BULAN_SINGKAT} / {BULAN_ROMAWI} / {TAHUN}',
  \`kota_default\` VARCHAR(100) DEFAULT 'Banyuwangi',
  \`mode_kop_pdf\` VARCHAR(50) DEFAULT 'banner',
  \`diperbarui_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`template\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`template\`;
CREATE TABLE \`template\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`jenis\` VARCHAR(50) NOT NULL,
  \`nama_template\` VARCHAR(200) NOT NULL,
  \`judul_dokumen\` VARCHAR(200),
  \`perihal\` VARCHAR(255),
  \`kalimat_pembuka\` TEXT,
  \`keterangan\` LONGTEXT,
  \`kalimat_penutup\` TEXT,
  \`is_default\` TINYINT(1) DEFAULT 0,
  \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`barang\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`barang\`;
CREATE TABLE \`barang\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nama\` VARCHAR(255) NOT NULL,
  \`satuan\` VARCHAR(50) NOT NULL,
  \`harga_satuan\` DECIMAL(15,2) NOT NULL,
  \`tipe\` VARCHAR(50) DEFAULT 'barang',
  \`aktif\` TINYINT(1) DEFAULT 1,
  \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`pelanggan\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`pelanggan\`;
CREATE TABLE \`pelanggan\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nama\` VARCHAR(200) NOT NULL,
  \`alamat\` TEXT,
  \`kontak\` VARCHAR(100),
  \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`nota\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`nota\`;
CREATE TABLE \`nota\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nomor_surat\` VARCHAR(100) NOT NULL,
  \`nomor_urut\` INT,
  \`jenis\` VARCHAR(50) NOT NULL,
  \`judul_dokumen\` VARCHAR(200),
  \`template_id\` INT,
  \`tanggal\` VARCHAR(100) NOT NULL,
  \`kota\` VARCHAR(100) NOT NULL,
  \`penerima_nama\` VARCHAR(200) NOT NULL,
  \`penerima_alamat\` TEXT,
  \`perihal\` VARCHAR(255),
  \`kalimat_pembuka\` TEXT,
  \`keterangan\` LONGTEXT,
  \`kalimat_penutup\` TEXT,
  \`pakai_ppn\` TINYINT(1) DEFAULT 1,
  \`tarif_ppn\` DECIMAL(5,2) DEFAULT 11.00,
  \`harga_include_ppn\` TINYINT(1) DEFAULT 0,
  \`subtotal\` DECIMAL(15,2) DEFAULT 0.00,
  \`nilai_ppn\` DECIMAL(15,2) DEFAULT 0.00,
  \`grand_total\` DECIMAL(15,2) DEFAULT 0.00,
  \`status\` VARCHAR(50) DEFAULT 'Draft',
  \`dibuat_pada\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`nota_item\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`nota_item\`;
CREATE TABLE \`nota_item\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nota_id\` INT NOT NULL,
  \`barang_id\` INT,
  \`nama_barang\` VARCHAR(255) NOT NULL,
  \`satuan\` VARCHAR(50) NOT NULL,
  \`qty\` DECIMAL(10,2) NOT NULL,
  \`harga_satuan\` DECIMAL(15,2) NOT NULL,
  \`subtotal\` DECIMAL(15,2) NOT NULL,
  INDEX \`idx_nota_id\` (\`nota_id\`),
  CONSTRAINT \`fk_nota_item_nota\` FOREIGN KEY (\`nota_id\`) REFERENCES \`nota\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

  const tables = ['pengguna', 'pengaturan_perusahaan', 'template', 'barang', 'pelanggan', 'nota', 'nota_item'];

  for (const table of tables) {
    const rows = await db.allAsync(`SELECT * FROM ${table}`);
    if (rows && rows.length > 0) {
      sql += `-- --------------------------------------------------------\n`;
      sql += `-- Data for table \`${table}\` (${rows.length} records)\n`;
      sql += `-- --------------------------------------------------------\n`;
      
      const columns = Object.keys(rows[0]);
      const colNames = columns.map(c => `\`${c}\``).join(', ');

      for (const row of rows) {
        const values = columns.map(c => escapeSql(row[c])).join(', ');
        sql += `INSERT INTO \`${table}\` (${colNames}) VALUES (${values});\n`;
      }
      sql += `\n`;
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

  const outputPath = path.join(__dirname, 'database.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`Sukses membuat file SQL di: ${outputPath}`);
  process.exit(0);
}

setTimeout(exportSql, 500);
