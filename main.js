import { readData, writeData, updateRekap } from './sheets-api.js';

// Inisialisasi
let map, detailMap, marker;
let currentLocation = { lat: -6.175392, lng: 106.827153 }; // Default Jakarta

// Fungsi utama saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    // Tampilkan username
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        document.getElementById('usernameDisplay').textContent = currentUser.name;
    }
    
    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // Inisialisasi peta
    initMap();
    
    // Load data
    await loadRekapData();
    await loadFullData();
    
    // Setup form
    setupForm();
});

// Inisialisasi peta
function initMap() {
    map = L.map('map').setView([currentLocation.lat, currentLocation.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    marker = L.marker([currentLocation.lat, currentLocation.lng], { draggable: true }).addTo(map);
    
    marker.on('dragend', function() {
        const position = marker.getLatLng();
        document.getElementById('latitude').value = position.lat;
        document.getElementById('longitude').value = position.lng;
    });
    
    document.getElementById('getLocationBtn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    map.setView(pos, 13);
                    marker.setLatLng(pos);
                    document.getElementById('latitude').value = pos.lat;
                    document.getElementById('longitude').value = pos.lng;
                },
                () => {
                    alert('Gagal mendapatkan lokasi. Pastikan izin lokasi diberikan.');
                }
            );
        } else {
            alert('Browser tidak mendukung geolocation.');
        }
    });
}

// Memuat data rekap
async function loadRekapData() {
    const rekapTableBody = document.getElementById('rekapTableBody');
    rekapTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Memuat data...</td></tr>';
    
    const data = await readData('rekap_harga');
    
    if (!data || data.length === 0) {
        rekapTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data</td></tr>';
        return;
    }
    
    const header = data[0];
    const rows = data.slice(1);
    
    rekapTableBody.innerHTML = '';
    
    rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${row[0] || '-'}</td>
            <td>${row[1] || '-'}</td>
            <td>${formatRupiah(row[2]) || '-'}</td>
            <td>${formatDate(row[3]) || '-'}</td>
            <td>
                <button class="btn btn-sm btn-info btn-detail-rekap" data-kode="${row[0]}">Detail</button>
                <button class="btn btn-sm btn-warning btn-filter" data-kode="${row[0]}">Filter</button>
            </td>
        `;
        
        rekapTableBody.appendChild(tr);
    });
    
    // Tambahkan event listener
    document.querySelectorAll('.btn-detail-rekap').forEach(btn => {
        btn.addEventListener('click', () => showDetailByKode(btn.getAttribute('data-kode')));
    });
    
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => filterByKode(btn.getAttribute('data-kode')));
    });
}

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
    document.getElementById('tambahBahanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const kodeBahan = document.getElementById('kodeBahan').value;
        const namaBahan = document.getElementById('namaBahan').value;
        const deskripsi = document.getElementById('deskripsi').value;
        const merek = document.getElementById('merek').value;
        const harga = parseInt(document.getElementById('harga').value);
        const supplier = document.getElementById('supplier').value;
        const fotoFile = document.getElementById('foto').files[0];
        const lat = parseFloat(document.getElementById('latitude').value) || currentLocation.lat;
        const lng = parseFloat(document.getElementById('longitude').value) || currentLocation.lng;
        
        // Upload foto ke tempat penyimpanan (contoh: ImgBB)
        let fotoUrl = '';
        if (fotoFile) {
            fotoUrl = await uploadImage(fotoFile);
        }
        
        // Format data untuk disimpan
        const newData = [
            '', // No (auto increment)
            new Date().toISOString(), // Tanggal Input
            kodeBahan,
            namaBahan,
            deskripsi,
            merek,
            harga,
            supplier,
            fotoUrl,
            lat,
            lng
        ];
        
        // Simpan ke Google Sheets
        const success = await writeData('data_lengkap', newData);
        
        if (success) {
            // Update rekap
            await updateRekap(kodeBahan, namaBahan, harga);
            
            alert('Data berhasil disimpan!');
            document.getElementById('tambahBahanForm').reset();
            
            // Reload data
            await loadRekapData();
            await loadFullData();
        } else {
            alert('Gagal menyimpan data');
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