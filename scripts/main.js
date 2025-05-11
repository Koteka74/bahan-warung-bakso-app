// Konfigurasi
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyEgm4H9dJfHeuEtSin4G2jhrsbg_nh4fBuYPIaX7DEYAolbpMfFW37808iVnfPxPR8hg/exec';

// ========== FUNGSI UTAMA DENGAN CORS FIX ==========

// Fungsi untuk membaca data dengan CORS proxy fallback
async function fetchData(sheetName) {
  const targetUrl = `${APP_SCRIPT_URL}?sheet=${sheetName}`;
  
  try {
    // Coba request langsung dulu
    const directResponse = await fetch(targetUrl, {
      redirect: 'follow',
      credentials: 'omit'
    });
    
    if (directResponse.ok) {
      return await directResponse.json();
    }
  } catch (directError) {
    console.log("Direct request failed, trying proxy...");
  }

  // Jika gagal, gunakan proxy
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  try {
    const response = await fetch(proxyUrl);
    const data = await response.json();
    return JSON.parse(data.contents);
  } catch (proxyError) {
    throw new Error(`Gagal memuat data: ${proxyError.message}`);
  }
}

// Fungsi untuk mengirim data dengan CORS proxy fallback
async function postData(sheetName, rowData) {
  const payload = {
    action: 'addData',
    sheet: sheetName,
    data: rowData
  };

  try {
    // Coba request langsung dulu
    const directResponse = await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      credentials: 'omit'
    });
    
    if (directResponse.ok) {
      return await directResponse.json();
    }
  } catch (directError) {
    console.log("Direct POST failed, trying proxy...");
  }

  // Jika gagal, gunakan proxy
  const proxyUrl = `https://api.allorigins.win/post`;
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: APP_SCRIPT_URL,
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify(payload)
      })
    });
    
    const data = await response.json();
    return JSON.parse(data.contents);
  } catch (proxyError) {
    throw new Error(`Gagal mengirim data: ${proxyError.message}`);
  }
}

// ========== IMPLEMENTASI FUNGSI ==========

// Memuat data rekap (sudah diperbaiki)
async function loadRekapData() {
  const rekapTableBody = document.getElementById('rekapTableBody');
  rekapTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></td></tr>';

  try {
    const data = await fetchData('rekap_harga');
    
    if (!data || data.length <= 1) {
      rekapTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-4 text-muted">
            <i class="fas fa-info-circle me-2"></i> Data rekap kosong
          </td>
        </tr>`;
      return;
    }

    // Render tabel
    rekapTableBody.innerHTML = data.slice(1).map(row => `
      <tr>
        <td>${row[0] || '-'}</td>
        <td>${row[1] || '-'}</td>
        <td>${formatRupiah(row[2]) || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary btn-detail-rekap" data-kode="${row[0]}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    rekapTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Gagal memuat data rekap
        </td>
      </tr>`;
    console.error("Error loading rekap:", error);
  }
}

// Setup form tambah data (sudah diperbaiki)
function setupForm() {
  const form = document.getElementById('tambahBahanForm');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    submitBtn.disabled = true;

    try {
      const newData = [
        new Date().toISOString(),
        document.getElementById('kodeBahan').value,
        document.getElementById('namaBahan').value,
        document.getElementById('deskripsi').value,
        document.getElementById('merek').value,
        document.getElementById('harga').value,
        document.getElementById('supplier').value,
        '', // Foto URL
        document.getElementById('latitude').value || currentLocation.lat,
        document.getElementById('longitude').value || currentLocation.lng
      ];

      const result = await postData('data_lengkap', newData);
      
      if (result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Data berhasil disimpan',
          confirmButtonColor: '#28a745'
        });
        form.reset();
        form.classList.remove('was-validated');
        await loadFullData();
        await loadRekapData();
      } else {
        throw new Error(result.message || 'Gagal menyimpan data');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: error.message || 'Terjadi kesalahan saat menyimpan',
        confirmButtonColor: '#dc3545'
      });
      console.error("Save error:", error);
    } finally {
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  });
}

// [Fungsi-fungsi lain tetap sama seperti sebelumnya]
// ... initMap, loadFullData, showDetail, formatRupiah, dll ...

// Memuat data lengkap
async function loadFullData() {
    const dataTableBody = document.getElementById('dataTableBody');
    dataTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Memuat data...</td></tr>';
    
    const data = await readData('data_lengkap');
    
    if (!data || data.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data</td></tr>';
        return;
    }
    
    const header = data[0];
    const rows = data.slice(1);
    
    dataTableBody.innerHTML = '';
    
    rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatDate(row[1]) || '-'}</td>
            <td>${row[2] || '-'}</td>
            <td>${row[3] || '-'}</td>
            <td>${row[5] || '-'}</td>
            <td>${formatRupiah(row[6]) || '-'}</td>
            <td>${row[7] || '-'}</td>
            <td>
                <button class="btn btn-sm btn-info btn-detail" data-id="${index}">Detail</button>
                <button class="btn btn-sm btn-danger btn-delete" data-id="${index}">Hapus</button>
            </td>
        `;
        
        dataTableBody.appendChild(tr);
    });
    
    // Tambahkan event listener
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', () => showDetail(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteData(btn.getAttribute('data-id')));
    });
}

// Setup form tambah data
function setupForm() {
  const form = document.getElementById('tambahBahanForm');
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validasi input
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    try {
      // Ambil nilai form
      const newData = [
        '', // No (auto increment)
        new Date().toISOString(), // Tanggal Input
        document.getElementById('kodeBahan').value,
        document.getElementById('namaBahan').value,
        document.getElementById('deskripsi').value,
        document.getElementById('merek').value,
        document.getElementById('harga').value,
        document.getElementById('supplier').value,
        '', // Foto URL (kosongkan jika tidak ada upload)
        '', // Latitude
        ''  // Longitude
      ];

      // Kirim ke Google Sheets
      const response = await fetch(https://script.google.com/macros/s/AKfycbx-GmT5FI3i9PXayY-w9elLGI78pLeKKODp3QTXg_E_ymTvo2jGy0j35SWO07DBFS8mSw/exec, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sheet: 'data_lengkap',
          data: newData 
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Sukses!',
          text: 'Data berhasil disimpan',
          confirmButtonColor: '#28a745'
        });
        form.reset();
        form.classList.remove('was-validated');
        loadFullData(); // Refresh tabel
      } else {
        throw new Error('Gagal menyimpan data');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.message,
        confirmButtonColor: '#dc3545'
      });
    }
  });
}

// Upload gambar ke ImgBB (contoh)
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        return data.data.url;
    } catch (error) {
        console.error('Error uploading image:', error);
        return '';
    }
}

// Menampilkan detail bahan
async function showDetail(rowIndex) {
    const data = await readData('data_lengkap');
    
    if (!data || rowIndex >= data.length - 1) {
        alert('Data tidak ditemukan');
        return;
    }
    
    const rowData = data[parseInt(rowIndex) + 1]; // +1 karena header
    
    showDetailInModal({
        kode_bahan: rowData[2],
        nama_bahan: rowData[3],
        deskripsi: rowData[4],
        merek: rowData[5],
        harga: rowData[6],
        supplier: rowData[7],
        foto_url: rowData[8],
        lokasi: {
            lat: parseFloat(rowData[9]),
            lng: parseFloat(rowData[10])
        }
    });
}

// Menampilkan detail berdasarkan kode bahan
async function showDetailByKode(kodeBahan) {
    const data = await readData('data_lengkap');
    
    if (!data) {
        alert('Data tidak ditemukan');
        return;
    }
    
    const header = data[0];
    const kodeIndex = header.indexOf('Kode Bahan');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][kodeIndex] === kodeBahan) {
            showDetailInModal({
                kode_bahan: data[i][2],
                nama_bahan: data[i][3],
                deskripsi: data[i][4],
                merek: data[i][5],
                harga: data[i][6],
                supplier: data[i][7],
                foto_url: data[i][8],
                lokasi: {
                    lat: parseFloat(data[i][9]),
                    lng: parseFloat(data[i][10])
                }
            });
            return;
        }
    }
    
    alert('Data tidak ditemukan');
}

// Menampilkan detail di modal
function showDetailInModal(data) {
    document.getElementById('detailModalTitle').textContent = data.nama_bahan;
    document.getElementById('detailKode').textContent = data.kode_bahan;
    document.getElementById('detailNama').textContent = data.nama_bahan;
    document.getElementById('detailMerek').textContent = data.merek || '-';
    document.getElementById('detailDeskripsi').textContent = data.deskripsi || '-';
    document.getElementById('detailHarga').textContent = formatRupiah(data.harga);
    document.getElementById('detailSupplier').textContent = data.supplier || '-';
    
    // Foto
    const fotoElement = document.getElementById('detailFoto');
    if (data.foto_url) {
        fotoElement.src = data.foto_url;
        fotoElement.style.display = 'block';
    } else {
        fotoElement.style.display = 'none';
    }
    
    // Peta
    if (detailMap) {
        detailMap.remove();
    }
    
    detailMap = L.map('detailMap').setView([data.lokasi.lat, data.lokasi.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(detailMap);
    L.marker([data.lokasi.lat, data.lokasi.lng]).addTo(detailMap)
        .bindPopup(`Lokasi Supplier: ${data.supplier || 'Tidak diketahui'}`)
        .openPopup();
    
    // Tampilkan modal
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
}

// Filter data berdasarkan kode bahan
async function filterByKode(kodeBahan) {
    // Aktifkan tab data lengkap
    const dataTab = new bootstrap.Tab(document.getElementById('data-tab'));
    dataTab.show();
    
    // Load data
    const data = await readData('data_lengkap');
    
    if (!data) {
        alert('Gagal memuat data');
        return;
    }
    
    const header = data[0];
    const kodeIndex = header.indexOf('Kode Bahan');
    const rows = data.slice(1);
    
    const dataTableBody = document.getElementById('dataTableBody');
    dataTableBody.innerHTML = '';
    
    let counter = 1;
    let found = false;
    
    rows.forEach((row, index) => {
        if (row[kodeIndex] === kodeBahan) {
            found = true;
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${counter++}</td>
                <td>${formatDate(row[1]) || '-'}</td>
                <td>${row[2] || '-'}</td>
                <td>${row[3] || '-'}</td>
                <td>${row[5] || '-'}</td>
                <td>${formatRupiah(row[6]) || '-'}</td>
                <td>${row[7] || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-detail" data-id="${index}">Detail</button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${index}">Hapus</button>
                </td>
            `;
            
            dataTableBody.appendChild(tr);
        }
    });
    
    if (!found) {
        dataTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data untuk kode bahan ini</td></tr>';
    }
    
    // Tambahkan event listener
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', () => showDetail(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteData(btn.getAttribute('data-id')));
    });
}

// Hapus data (implementasi sederhana)
async function deleteData(rowIndex) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    
    // Catatan: Implementasi hapus di Google Sheets lebih kompleks
    // Ini hanya contoh sederhana dengan mengosongkan baris
    
    const data = await readData('data_lengkap');
    if (!data || rowIndex >= data.length - 1) {
        alert('Data tidak ditemukan');
        return;
    }
    
    // Dalam implementasi nyata, gunakan sheets.spreadsheets.batchUpdate
    // dengan request deleteDimension untuk menghapus baris
    
    alert('Fitur hapus membutuhkan implementasi tambahan untuk Google Sheets API');
    
    // Setelah berhasil hapus, reload data
    // await loadFullData();
    // await loadRekapData();
}

// Helper: Format rupiah
function formatRupiah(amount) {
    if (!amount) return 'Rp 0';
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Helper: Format tanggal
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
