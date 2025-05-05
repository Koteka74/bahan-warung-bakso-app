const SPREADSHEET_ID = '1ig_PseaV17R4AOQxD1cDr23fqaZYTixqt854yoiEsUA'; // Ganti dengan ID spreadsheet Anda
const SHEET_NAME_DATA = 'data_lengkap';
const SHEET_NAME_REKAP = 'rekap_harga';

// Inisialisasi Google Sheets API
async function initGoogleSheets() {
    const { GoogleAuth } = await import('google-auth-library');
    const { google } = await import('googleapis');
    
    const auth = new GoogleAuth({
        keyFile: './assets/service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
}

// Membaca data dari sheet
async function readData(sheetName) {
    try {
        const sheets = await initGoogleSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:Z`,
        });
        return response.data.values;
    } catch (error) {
        console.error('Error reading data:', error);
        return null;
    }
}

// Menulis data ke sheet
async function writeData(sheetName, data) {
    try {
        const sheets = await initGoogleSheets();
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [data]
            }
        });
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// Update data rekap
async function updateRekap(kodeBahan, namaBahan, harga) {
    try {
        const sheets = await initGoogleSheets();
        
        // 1. Cek apakah kode bahan sudah ada di rekap
        const rekapData = await readData(SHEET_NAME_REKAP);
        const header = rekapData[0];
        const rows = rekapData.slice(1);
        
        let existingRowIndex = -1;
        let lowestPrice = harga;
        
        // Cari harga terendah untuk kode bahan ini
        const allData = await readData(SHEET_NAME_DATA);
        const allDataHeader = allData[0];
        const kodeBahanIndex = allDataHeader.indexOf('Kode Bahan');
        const hargaIndex = allDataHeader.indexOf('Harga');
        
        for (let i = 1; i < allData.length; i++) {
            if (allData[i][kodeBahanIndex] === kodeBahan) {
                const itemPrice = parseInt(allData[i][hargaIndex]);
                if (itemPrice < lowestPrice) {
                    lowestPrice = itemPrice;
                }
            }
        }
        
        // Cari di data rekap
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === kodeBahan) {
                existingRowIndex = i + 1; // +1 karena header
                break;
            }
        }
        
        // 2. Update atau tambah data
        if (existingRowIndex > 0) {
            // Update existing
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME_REKAP}!A${existingRowIndex}:D${existingRowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[
                        kodeBahan,
                        namaBahan,
                        lowestPrice,
                        new Date().toISOString()
                    ]]
                }
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

export { readData, writeData, updateRekap };