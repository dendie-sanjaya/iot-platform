// device-simulator.js

const mqtt = require('mqtt');

// Kredensial Otentikasi
// Ini harus cocok dengan data yang ada di database SQL Anda
const DEVICE_ID = 'sensor_ruang_001'; // Akan digunakan sebagai username
const TOKEN = 'A1B2C3D4E5F6'; // Akan digunakan sebagai password

// Detail Koneksi MQTT Broker
const HOST = 'mqtt://localhost'; // Ganti dengan alamat IP/domain Broker Anda
const PORT = 1883; // Port default MQTT

const options = {
  port: PORT,
  clientId: 'mqtt_' + Math.random().toString(16).substr(2, 8), // Client ID unik
  username: DEVICE_ID, // Username untuk autentikasi
  password: TOKEN,     // Password untuk autentikasi
  keepalive: 60,
  reconnectPeriod: 1000,
  clean: true
};

// Topik tempat data akan dipublikasikan
const TOPIC = 'iot/data/' + DEVICE_ID;

// 1. Hubungkan ke Broker
console.log(`Mencoba terhubung sebagai: ${DEVICE_ID}`);
const client = mqtt.connect(HOST, options);

client.on('connect', function () {
  console.log('Berhasil terhubung ke MQTT Broker.');

  // Mulai mengirim data setiap 5 detik
  setInterval(() => {
    // 2. Buat Payload (Data Sensor)
    const payload = {
      timestamp: new Date().toISOString(),
      deviceId: DEVICE_ID,
      temperature: (Math.random() * (30 - 20) + 20).toFixed(2), // Suhu acak antara 20-30
      humidity: (Math.random() * (70 - 40) + 40).toFixed(2)      // Kelembaban acak antara 40-70
    };
    
    const message = JSON.stringify(payload);

    // 3. Publikasikan Pesan
    client.publish(TOPIC, message, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error('Gagal memublikasikan pesan:', err);
      } else {
        console.log(`➡️ Mengirim ke ${TOPIC}: ${message}`);
      }
    });

  }, 5000); // Kirim setiap 5000 milidetik (5 detik)
});

client.on('error', function (error) {
  // Ini akan terjadi jika autentikasi GAGAL (username/password salah)
  console.error('Kesalahan Koneksi atau Autentikasi Gagal:', error.message);
  client.end();
});