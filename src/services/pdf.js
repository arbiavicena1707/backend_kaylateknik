const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { uploadsDir } = require('../db');

function formatRupiah(amount) {
  if (isNaN(amount) || amount === null) return 'Rp 0';
  const parts = Math.round(amount).toString().split('');
  let result = '';
  let count = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    result = parts[i] + result;
    count++;
    if (count % 3 === 0 && i !== 0) {
      result = '.' + result;
    }
  }
  return 'Rp ' + result;
}

function generateNotaPDF(nota, items, pengaturan, stream, mode = 'banner') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 40, left: 40, right: 40 },
        bufferPages: true
      });

      doc.pipe(stream);

      const orangePrimary = '#F57C00';
      const orangeDark = '#E65100';
      const textDark = '#212121';
      const textMuted = '#555555';
      const borderGrey = '#D0D0D0';
      const lightBg = '#FFF8E1';

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;

      // 1. KOP SURAT (Dua Mode: 'banner' / Logo Besar & 'standar' / Versi Sekarang)
      let topY = 36;
      let hasLogo = false;

      // Pilih logo sesuai mode kop PDF dengan fallback
      const selectedLogoPath = mode === 'standar'
        ? (pengaturan.logo_standar_path || pengaturan.logo_path)
        : (pengaturan.logo_path || pengaturan.logo_standar_path);

      const logoFilename = selectedLogoPath ? path.basename(selectedLogoPath) : null;
      const fullLogoPath = logoFilename ? path.join(uploadsDir, logoFilename) : null;

      if (mode === 'standar') {
        // --- MODE 1: VERSI SEKARANG (STANDAR / KLASIK) ---
        // Logo kecil di kiri (fit 65x65), nama usaha dan alamat di samping logo
        if (fullLogoPath && fs.existsSync(fullLogoPath)) {
          try {
            doc.image(fullLogoPath, 40, topY, { fit: [65, 65] });
            hasLogo = true;
          } catch (e) {
            console.warn('Gagal memuat file logo:', e.message);
          }
        }

        const headerTextX = hasLogo ? 115 : 40;
        const headerTextWidth = hasLogo ? contentWidth - 75 : contentWidth;

        doc.fillColor(orangeDark)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text((pengaturan.nama_usaha || 'MIKAYLA TEKNIK').toUpperCase(), headerTextX, topY, { width: headerTextWidth });

        doc.fillColor(textDark)
          .fontSize(9)
          .font('Helvetica')
          .moveDown(0.25)
          .text(pengaturan.alamat || 'Banyuwangi, Jawa Timur', { width: headerTextWidth });

        const kontakText = [
          pengaturan.no_hp ? `HP/WA: ${pengaturan.no_hp}` : '',
          pengaturan.email ? `Email: ${pengaturan.email}` : ''
        ].filter(Boolean).join('  |  ');

        if (kontakText) {
          doc.fillColor(textMuted)
            .fontSize(8.5)
            .text(kontakText, { width: headerTextWidth });
        }

        topY = Math.max(doc.y + 8, topY + 68);
        doc.strokeColor(orangePrimary).lineWidth(2.5).moveTo(40, topY).lineTo(40 + contentWidth, topY).stroke();
        doc.strokeColor('#333333').lineWidth(0.8).moveTo(40, topY + 4).lineTo(40 + contentWidth, topY + 4).stroke();

        topY += 14;
      } else {
        // --- MODE 2: VERSI LOGO BESAR / BANNER (LOGO BESAR DI KIRI, NAMA & ALAMAT TEMPAT DI KANAN) ---
        const leftColWidth = 240;
        const rightColX = 285;
        const rightColWidth = contentWidth - (rightColX - 40); // 270.28 pt

        if (fullLogoPath && fs.existsSync(fullLogoPath)) {
          try {
            // Render logo banner lebar tanpa dipaksa kotak kecil 65x65
            doc.image(fullLogoPath, 40, topY, { fit: [leftColWidth, 68] });
            hasLogo = true;
          } catch (e) {
            console.warn('Gagal memuat file logo banner:', e.message);
          }
        }

        if (!hasLogo) {
          // Jika belum unggah logo, tampilkan nama usaha besar & tegas
          doc.fillColor(orangeDark)
            .fontSize(20)
            .font('Helvetica-Bold')
            .text((pengaturan.nama_usaha || 'MIKAYLA TEKNIK').toUpperCase(), 40, topY, { width: leftColWidth });

          doc.fillColor(textDark)
            .fontSize(8.5)
            .font('Helvetica')
            .moveDown(0.2)
            .text('BENGKEL BUBUT, LAS & REKAYASA TEKNIK', { width: leftColWidth });
        }

        // Kolom Kanan: Nama Tempat, Alamat, dan Kontak
        let rightY = topY;
        doc.fillColor(orangeDark)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text((pengaturan.nama_usaha || 'MIKAYLA TEKNIK').toUpperCase(), rightColX, rightY, { width: rightColWidth, align: 'right' });

        rightY = doc.y + 2;

        if (pengaturan.alamat) {
          doc.fillColor(textDark)
            .fontSize(8.5)
            .font('Helvetica')
            .text(pengaturan.alamat, rightColX, rightY, { width: rightColWidth, align: 'right' });
          rightY = doc.y + 2;
        }

        const kontakText = [
          pengaturan.no_hp ? `HP/WA: ${pengaturan.no_hp}` : '',
          pengaturan.email ? `Email: ${pengaturan.email}` : ''
        ].filter(Boolean).join('  |  ');

        if (kontakText) {
          doc.fillColor(textMuted)
            .fontSize(8)
            .font('Helvetica')
            .text(kontakText, rightColX, rightY, { width: rightColWidth, align: 'right' });
          rightY = doc.y;
        }

        topY = Math.max(topY + 70, rightY + 8);

        // Separator lines
        doc.strokeColor(orangePrimary).lineWidth(2.5).moveTo(40, topY).lineTo(40 + contentWidth, topY).stroke();
        doc.strokeColor('#333333').lineWidth(0.8).moveTo(40, topY + 4).lineTo(40 + contentWidth, topY + 4).stroke();

        topY += 14;
      }

      // 2. HEADER DOKUMEN (Nomor, Tanggal, Kepada)
      const effectiveTitle = (nota.judul_dokumen && nota.judul_dokumen.trim())
        || (nota.template_judul_dokumen && nota.template_judul_dokumen.trim());
      const docTypeTitle = effectiveTitle
        ? effectiveTitle.trim().toUpperCase()
        : (nota.jenis === 'penawaran' ? 'SURAT PENAWARAN HARGA' : (nota.jenis ? nota.jenis.toUpperCase() : 'NOTA TAGIHAN'));

      doc.fillColor(textDark).fontSize(12).font('Helvetica-Bold')
        .text(docTypeTitle, 40, topY, { align: 'center', width: contentWidth });

      topY = doc.y + 8;

      // Left: Nomor & Perihal
      doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark);
      doc.text('Nomor Surat', 40, topY);
      doc.font('Helvetica').text(`: ${nota.nomor_surat || '-'}`, 110, topY);

      doc.font('Helvetica-Bold').text('Perihal', 40, topY + 14);
      doc.font('Helvetica').text(`: ${nota.perihal || '-'}`, 110, topY + 14);

      // Right: Tanggal & Kota
      const dateText = `${nota.kota || pengaturan.kota_default || 'Banyuwangi'}, ${nota.tanggal || '-'}`;
      doc.font('Helvetica').fontSize(9).text(dateText, 40, topY, { align: 'right', width: contentWidth });

      topY += 34;

      // Kepada Yth
      doc.font('Helvetica-Bold').fontSize(9).text('Kepada Yth.', 40, topY);
      doc.font('Helvetica').text(nota.penerima_nama || 'Bapak/Ibu Pimpinan', 40, topY + 13);
      if (nota.penerima_alamat) {
        doc.font('Helvetica').text(nota.penerima_alamat, 40, topY + 25, { width: 300 });
        topY = doc.y + 6;
      } else {
        topY += 30;
      }

      // Kalimat Pembuka
      if (nota.kalimat_pembuka) {
        doc.font('Helvetica').fontSize(9).fillColor(textDark)
          .text(nota.kalimat_pembuka, 40, topY, { width: contentWidth, align: 'justify' });
        topY = doc.y + 10;
      }

      // 3. TABEL ITEM
      const colX = {
        no: 40,
        nama: 70,
        qty: 295,
        harga: 360,
        total: 455
      };
      const colW = {
        no: 30,
        nama: 225,
        qty: 65,
        harga: 95,
        total: 40 + contentWidth - 455 // Pastikan pas hingga tepi kanan tabel (100.28 pt)
      };

      // Header row
      const tableHeaderHeight = 22;
      doc.rect(40, topY, contentWidth, tableHeaderHeight).fill('#E65100');

      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('NO', colX.no, topY + 6, { width: colW.no, align: 'center' });
      doc.text('Bahan dan Alat / Uraian', colX.nama + 4, topY + 6, { width: colW.nama - 4, align: 'left' });
      doc.text('Jumlah', colX.qty, topY + 6, { width: colW.qty, align: 'center' });
      doc.text('Harga Satuan', colX.harga, topY + 6, { width: colW.harga - 4, align: 'right' });
      doc.text('Total', colX.total, topY + 6, { width: colW.total - 6, align: 'right' });

      topY += tableHeaderHeight;

      // Table body
      doc.font('Helvetica').fontSize(8.5);
      items.forEach((item, index) => {
        const isEven = index % 2 === 0;
        const rowBg = isEven ? '#FFFFFF' : '#FFF9F0';

        const nameHeight = doc.heightOfString(item.nama_barang, { width: colW.nama - 8 });
        const rowHeight = Math.max(20, nameHeight + 8);

        doc.rect(40, topY, contentWidth, rowHeight).fill(rowBg);
        doc.rect(40, topY, contentWidth, rowHeight).strokeColor(borderGrey).lineWidth(0.5).stroke();

        doc.fillColor(textDark);
        doc.text(String(index + 1), colX.no, topY + 5, { width: colW.no, align: 'center' });
        doc.text(item.nama_barang, colX.nama + 4, topY + 5, { width: colW.nama - 8, align: 'left' });
        doc.text(`${item.qty} ${item.satuan || ''}`, colX.qty, topY + 5, { width: colW.qty, align: 'center' });
        doc.text(formatRupiah(item.harga_satuan), colX.harga, topY + 5, { width: colW.harga - 4, align: 'right' });
        doc.text(formatRupiah(item.subtotal), colX.total, topY + 5, { width: colW.total - 6, align: 'right' });

        topY += rowHeight;
      });


      // 4. RINGKASAN TOTAL & PPN
      // Samakan batas kanan angka dengan kolom Total barang
      const tableRight = 40 + contentWidth;
      const summaryLabelW = 110;
      const summaryRight = tableRight;
      const summaryValueW = colW.total;
      const summaryValueX = summaryRight - summaryValueW;
      const summaryX = summaryValueX - summaryLabelW;
      const summaryW = summaryLabelW + summaryValueW;

      const renderSummaryRow = (label, value, isBold = false, isHighlight = false) => {
        const rowH = 18;

        if (isHighlight) {
          doc.rect(summaryX, topY, summaryW, rowH).fill(lightBg);
        }

        doc.rect(summaryX, topY, summaryW, rowH)
          .strokeColor(borderGrey)
          .lineWidth(0.5)
          .stroke();

        doc.fillColor(isHighlight ? orangeDark : textDark)
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.5);

        doc.text(
          label,
          summaryX + 6,
          topY + 4.5,
          { width: summaryLabelW - 10, align: 'left' }
        );

        doc.text(
          value,
          summaryValueX,
          topY + 4.5,
          { width: summaryValueW - 6, align: 'right' }
        );

        topY += rowH;
      };

      renderSummaryRow('Total', formatRupiah(nota.subtotal), true);

      if (nota.pakai_ppn) {
        const ppnLabel = `PPN ${nota.tarif_ppn || 11}%` +
          (nota.harga_include_ppn ? ' (Include)' : '');

        renderSummaryRow(ppnLabel, formatRupiah(nota.nilai_ppn));
      }

      renderSummaryRow(
        'Grand Total',
        formatRupiah(nota.grand_total),
        true,
        true
      );

      // DP (Down Payment) rows
      if (nota.pakai_dp && nota.persen_dp > 0) {
        const dpLabel = `DP (${nota.persen_dp}%)`;
        renderSummaryRow(dpLabel, formatRupiah(nota.nilai_dp));
        renderSummaryRow('Sisa Pembayaran', formatRupiah(nota.sisa_pembayaran), true, true);
      }

      topY += 12;

      // 5. KETERANGAN & REKENING
      let leftBottomY = topY;
      const leftColWidth = 280;

      let keteranganList = [];
      if (nota.keterangan) {
        try {
          keteranganList = JSON.parse(nota.keterangan);
        } catch (e) {
          keteranganList = nota.keterangan.split('\n').filter(Boolean);
        }
      }

      if (Array.isArray(keteranganList) && keteranganList.length > 0) {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textDark)
          .text('Keterangan & Ketentuan:', 40, leftBottomY);
        leftBottomY += 12;

        keteranganList.forEach((itemText) => {
          doc.font('Helvetica').fontSize(7.5).fillColor(textMuted);
          doc.text('•', 44, leftBottomY);
          doc.text(itemText, 52, leftBottomY, { width: leftColWidth - 12 });
          leftBottomY = doc.y + 2;
        });
      }

      // Bank account box
      if (pengaturan.nama_bank || pengaturan.no_rekening) {
        leftBottomY += 6;
        const bankBoxH = 46;
        doc.rect(40, leftBottomY, leftColWidth, bankBoxH).fill('#F5F5F5');
        doc.rect(40, leftBottomY, leftColWidth, bankBoxH).strokeColor(borderGrey).lineWidth(0.5).stroke();

        doc.fillColor(textDark).font('Helvetica-Bold').fontSize(8)
          .text('INFORMASI PEMBAYARAN / REKENING:', 48, leftBottomY + 6);

        doc.font('Helvetica').fontSize(8).fillColor(textDark);
        doc.text(`Bank       : ${pengaturan.nama_bank || '-'}`, 48, leftBottomY + 18);
        doc.text(`No. Rek : ${pengaturan.no_rekening || '-'} a.n. ${pengaturan.nama_rekening || '-'}`, 48, leftBottomY + 29);

        leftBottomY += bankBoxH + 8;
      }

      // 6. PENUTUP & TANDA TANGAN
      const sigX = 350;
      const sigW = 190;
      let sigY = topY;

      doc.fillColor(textDark).fontSize(8.5).font('Helvetica');
      doc.text(`${nota.kota || pengaturan.kota_default || 'Banyuwangi'}, ${nota.tanggal || '-'}`, sigX, sigY, { width: sigW, align: 'center' });
      sigY += 12;

      doc.font('Helvetica-Bold')
        .text((pengaturan.nama_usaha || 'MIKAYLA TEKNIK').toUpperCase(), sigX, sigY, { width: sigW, align: 'center' });
      sigY += 14;

      let hasTtd = false;
      const ttdFilename = pengaturan.ttd_path ? path.basename(pengaturan.ttd_path) : null;
      const fullTtdPath = ttdFilename ? path.join(uploadsDir, ttdFilename) : null;

      if (fullTtdPath && fs.existsSync(fullTtdPath)) {
        try {
          doc.image(fullTtdPath, sigX + 45, sigY, { fit: [100, 50] });
          hasTtd = true;
          sigY += 52;
        } catch (e) {
          console.warn('Gagal memuat file TTD:', e.message);
        }
      }

      if (!hasTtd) {
        sigY += 45;
      }

      doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark)
        .text(`( ${pengaturan.nama_penanda_tangan || 'Ahmad Hidayat'} )`, sigX, sigY, { width: sigW, align: 'center', underline: true });
      sigY += 13;

      if (pengaturan.jabatan_penanda_tangan) {
        doc.font('Helvetica').fontSize(8).fillColor(textMuted)
          .text(pengaturan.jabatan_penanda_tangan, sigX, sigY, { width: sigW, align: 'center' });
      }

      const finalBottomY = Math.max(leftBottomY, sigY + 16);
      if (nota.kalimat_penutup) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(textMuted)
          .text(nota.kalimat_penutup, 40, finalBottomY, { width: contentWidth, align: 'left' });
      }

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateNotaPDF,
  formatRupiah
};
