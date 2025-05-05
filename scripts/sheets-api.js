const SPREADSHEET_ID = '1ig_PseaV17R4AOQxD1cDr23fqaZYTixqt854yoiEsUA'; // Ganti dengan ID spreadsheet Anda
const API_KEY = 'AIzaSyDeBFp8OjVOdxneNqNcUMZIZJ8aR7fnaog'; // Dari Google Cloud Console
const SHEET_NAME_DATA = 'data_lengkap';
const SHEET_NAME_REKAP = 'rekap_harga';

// Helper untuk handle CORS (gunakan proxy jika diperlukan)
async function fetchWithCORS(url) {
  try {
    // Jika ada error CORS, gunakan proxy alternatif
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const response = await fetch(proxyUrl + url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error with CORS proxy:', error);
    // Fallback ke fetch langsung
    const response = await fetch(url);
    return await response.json();
  }
}

// Fungsi untuk membaca data
export async function readData(sheetName) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
    const data = await fetchWithCORS(url);
    return data.values || [];
  } catch (error) {
    console.error('Error reading data:', error);
    throw new Error('Gagal memuat data dari Google Sheets');
  }
}

// Fungsi untuk menulis data (menggunakan API Sheets)
export async function writeData(sheetName, rowData) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:Z:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData]
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
  }
}

// Fungsi update rekap (simplified)
export async function updateRekap(kodeBahan, namaBahan, harga) {
  try {
    // 1. Baca data lengkap untuk cari harga terendah
    const allData = await readData(SHEET_NAME_DATA);
    const header = allData[0];
    const kodeIndex = header.indexOf('Kode Bahan');
    const hargaIndex = header.indexOf('Harga');
    
    let lowestPrice = harga;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][kodeIndex] === kodeBahan) {
        const itemPrice = parseInt(allData[i][hargaIndex]);
        if (itemPrice < lowestPrice) {
          lowestPrice = itemPrice;
        }
      }
    }
    
    // 2. Update rekap
    const rekapData = await readData(SHEET_NAME_REKAP);
    const rekapHeader = rekapData[0];
    const kodeRekapIndex = rekapHeader.indexOf('Kode Bahan');
    
    let rowToUpdate = -1;
    for (let i = 1; i < rekapData.length; i++) {
      if (rekapData[i][kodeRekapIndex] === kodeBahan) {
        rowToUpdate = i + 1; // +1 karena header
        break;
      }
    }
    
    if (rowToUpdate > 0) {
      // Update existing row
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME_REKAP}!A${rowToUpdate}:D${rowToUpdate}?valueInputOption=USER_ENTERED&key=${API_KEY}`;
      
      await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[
            kodeBahan,
            namaBahan,
            lowestPrice,
            new Date().toISOString()
          ]]
        })
      });
    } else {
      // Tambah baru
      await writeData(SHEET_NAME_REKAP, [
        kodeBahan,
        namaBahan,
        lowestPrice,
        new Date().toISOString()
      ]);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating rekap:', error);
    return false;
  }
}
