const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 4000; // Ubah jika port ini sudah terpakai

// ----------------------------------------------------
// 1. KONFIGURASI DATABASE
// ----------------------------------------------------

// Ganti 'nama_database_anda' dan path host/port jika berbeda
const mongoUri = 'mongodb://localhost:27017/iot_platform_db'; 

mongoose.connect(mongoUri)
    .then(() => console.log('✅ Koneksi ke MongoDB berhasil.'))
    .catch(err => {
        console.error('❌ Gagal terhubung ke MongoDB:', err.message);
        process.exit(1);
    });

// ----------------------------------------------------
// 2. DEFINISI SCHEMA DAN MODEL MONGOOSE
//    (Disesuaikan dengan struktur data di screenshot Anda)
// ----------------------------------------------------

const sensorSchema = new mongoose.Schema({
    timestamp: { 
        type: Date, 
        default: Date.now, 
        index: true 
    },
    metadata: {
        deviceId: { 
            type: String, 
            required: true, 
            index: true // deviceId berada di dalam sub-dokumen metadata
        }
    },
    temperature: { type: Number },
    humidity: { type: Number },
    // Anda bisa menambahkan field sensor lain seperti pressure, light, dsb.
});

// Ganti 'sensor_collection' dengan nama koleksi (collection) yang benar di MongoDB Anda
const SensorData = mongoose.model('SensorData', sensorSchema, 'sensor_readings'); 


// ----------------------------------------------------
// 3. ENDPOINT API UNTUK MENGAMBIL RIWAYAT SENSOR
// ----------------------------------------------------

/**
 * Endpoint: /api/history
 * Query Parameters:
 * - deviceId (Wajib): ID perangkat (e.g., sensor_ruang_001)
 * - startDate (Wajib): Tanggal mulai (Format: YYYY-MM-DD)
 * - endDate (Wajib): Tanggal akhir (Format: YYYY-MM-DD)
 * - limit (Opsional): Batas jumlah data yang diambil (e.g., 10)
 */
app.get('/api/history', async (req, res) => {
    const { deviceId, startDate, endDate, limit } = req.query;

    // Validasi parameter wajib
    if (!deviceId || !startDate || !endDate) {
        return res.status(400).json({ 
            error: 'Parameter deviceId, startDate, dan endDate wajib diisi.' 
        });
    }

    // Konversi limit ke integer. Jika tidak valid atau 0, berarti tanpa batas.
    const dataLimit = parseInt(limit) > 0 ? parseInt(limit) : 0; 

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Atur tanggal akhir ke akhir hari untuk mencakup seluruh hari tersebut
        end.setHours(23, 59, 59, 999); 

        // Bangun Query Mongoose
        let query = SensorData.find({
            // Menggunakan notasi titik untuk mengakses field nested: 'metadata.deviceId'
            'metadata.deviceId': deviceId, 
            timestamp: { 
                $gte: start, 
                $lte: end    
            }
        })
        .sort({ timestamp: -1 }); // Urutkan dari yang terbaru

        // Terapkan Limit jika dataLimit > 0
        if (dataLimit > 0) {
            query = query.limit(dataLimit); 
        }
        
        const historyData = await query.exec(); // Eksekusi query

        if (historyData.length === 0) {
            return res.status(404).json({
                message: 'Tidak ada data sensor ditemukan untuk kriteria tersebut.'
            });
        }

        // Format respon agar lebih ringkas
        res.json({
            deviceId: deviceId,
            range: `${startDate} hingga ${endDate}`,
            count_returned: historyData.length,
            limit_applied: dataLimit > 0 ? dataLimit : 'No limit',
            data: historyData.map(item => ({
                timestamp: item.timestamp,
                temperature: item.temperature,
                humidity: item.humidity,
                // Hilangkan field metadata dari output utama
            }))
        });

    } catch (error) {
        console.error('Error saat mengambil data riwayat:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.', detail: error.message });
    }
});

// ----------------------------------------------------
// 4. MENJALANKAN SERVER
// ----------------------------------------------------
app.listen(port, () => {
    console.log(`📡 Server History Sensor berjalan pada http://localhost:${port}`);
});