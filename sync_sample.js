const { db, initDb } = require('./src/db');

async function syncExactTemplate() {
  await initDb();

  // 1. Update Pengaturan Perusahaan
  await db.runAsync(`
    UPDATE pengaturan_perusahaan SET
      nama_usaha = 'MIKAYLA TEHNIK',
      alamat = 'PERUMAHAN VILLA GAJAH MADA BLOK G 12\\nSINGONEGARAN – BANYUWANGI',
      no_hp = '082244180789',
      nama_bank = 'Mandiri',
      nama_rekening = 'Imam Sapi''i',
      no_rekening = '1-430-018-752525',
      nama_penanda_tangan = 'IMAM SAPI''I',
      jabatan_penanda_tangan = '',
      tarif_ppn_default = 11.0,
      format_nomor_surat = '{NOMOR} / MK / {BULAN_SINGKAT} / {BULAN_ROMAWI} / {TAHUN}',
      kota_default = 'Banyuwangi'
    WHERE id = (SELECT id FROM pengaturan_perusahaan LIMIT 1)
  `);

  // 2. Update Template Penawaran
  const ketList = JSON.stringify([
    "Validasi Harga : 1 Minggu dari Surat penawaran ini dibuat ,",
    "Pengerjaan 7 hari setelah terjadi kesepakatan ,",
    "Estimasi Pengerjaan 4 Hari ,",
    "Pembayaran setelah serah terima secara cash atau di tranfer ke :"
  ]);

  await db.runAsync(`
    UPDATE template SET
      nama_template = 'Surat Penawaran Maintenance Genset Hotel',
      perihal = 'Penawaran Maintenance Genset Hotel',
      kalimat_pembuka = 'Bersama ini kami mengajukan Penawaran Maintenance 2 Unit Genset Hotel , dengan rincian sebagai berikut :',
      keterangan = ?,
      kalimat_penutup = 'Demikian penawaran ini saya sampaikan , Kami Ucapkan Terima kasih .'
    WHERE jenis = 'penawaran'
  `, [ketList]);

  // 3. Update / Insert Master Barang
  const items = [
    { nama: 'Oil Filter', satuan: 'Pcs', harga: 865000, tipe: 'barang' },
    { nama: 'Fuel Filter', satuan: 'pcs', harga: 450000, tipe: 'barang' },
    { nama: 'Oli', satuan: 'Liter', harga: 55000, tipe: 'barang' },
    { nama: 'Saparator', satuan: 'Pcs', harga: 550000, tipe: 'barang' },
    { nama: 'Jasa', satuan: 'Unit', harga: 1500000, tipe: 'jasa' },
  ];

  for (const it of items) {
    const existing = await db.getAsync(`SELECT id FROM barang WHERE nama = ?`, [it.nama]);
    if (!existing) {
      await db.runAsync(`INSERT INTO barang (nama, satuan, harga_satuan, tipe) VALUES (?, ?, ?, ?)`,
        [it.nama, it.satuan, it.harga, it.tipe]);
    }
  }

  // 4. Update Nota 1 to be 100% identical to the sample PDF
  const existingNota = await db.getAsync(`SELECT id FROM nota WHERE id = 1`);
  if (existingNota) {
    await db.runAsync(`
      UPDATE nota SET
        nomor_surat = '66 / M K / S E P / I X / 2 0 2 4',
        tanggal = '30 September 2024',
        kota = 'Banyuwangi',
        penerima_nama = 'Bapak / Ibu Pimpinan',
        penerima_alamat = 'eL Hotel\\nBanyuwangi',
        perihal = 'Penawaran Maintenance Genset Hotel',
        kalimat_pembuka = 'Bersama ini kami mengajukan Penawaran Maintenance 2 Unit Genset Hotel , dengan rincian sebagai berikut :',
        keterangan = ?,
        kalimat_penutup = 'Demikian penawaran ini saya sampaikan , Kami Ucapkan Terima kasih .',
        pakai_ppn = 1,
        tarif_ppn = 11.0,
        harga_include_ppn = 0,
        subtotal = 9700000,
        nilai_ppn = 1067000,
        grand_total = 10767000,
        status = 'Disetujui'
      WHERE id = 1
    `, [ketList]);

    // Replace items of nota 1
    await db.runAsync(`DELETE FROM nota_item WHERE nota_id = 1`);
    const notaItems = [
      { nama: 'Oil Filter', satuan: 'Pcs', qty: 2, harga: 865000, subtotal: 1730000 },
      { nama: 'Fuel Filter', satuan: 'pcs', qty: 2, harga: 450000, subtotal: 900000 },
      { nama: 'Oli', satuan: 'Liter', qty: 54, harga: 55000, subtotal: 2970000 },
      { nama: 'Saparator', satuan: 'Pcs', qty: 2, harga: 550000, subtotal: 1100000 },
      { nama: 'Jasa', satuan: 'Unit', qty: 2, harga: 1500000, subtotal: 3000000 },
    ];

    for (const nit of notaItems) {
      await db.runAsync(`
        INSERT INTO nota_item (nota_id, nama_barang, satuan, qty, harga_satuan, subtotal)
        VALUES (1, ?, ?, ?, ?, ?)
      `, [nit.nama, nit.satuan, nit.qty, nit.harga, nit.subtotal]);
    }

    console.log('Successfully updated Nota 1 to match sample PDF exactly (Grand Total: Rp 10.767.000)');
  }

  process.exit(0);
}

syncExactTemplate().catch(console.error);
