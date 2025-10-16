const WebSocket = require('ws');
const amqp = require('amqplib/callback_api');

// --- DETAIL KONEKSI ---
const WEBSOCKET_PORT = 6000; // Port untuk Klien Web (Postman, Browser)
const RABBITMQ_URL = 'amqp://localhost:5672'; 
const RABBITMQ_EXCHANGE = 'iot_data_exchange';

// Opsi Queue: Membuat Queue temporer yang akan dihapus saat server mati
const REALTIME_QUEUE_OPTIONS = { exclusive: true, autoDelete: true }; 

// Inisialisasi WebSocket Server
// Menambahkan properti 'host: 0.0.0.0' secara eksplisit
const wss = new WebSocket.Server({ 
    port: WEBSOCKET_PORT, 
    host: '0.0.0.0' // <-- PERUBAHAN UTAMA DI SINI
});

console.log(`\n✅ WebSocket Server berjalan pada ws://0.0.0.0:${WEBSOCKET_PORT}`);
console.log('💡 Jika Anda menggunakan WSL, coba gunakan IP internal Anda (e.g., ws://172.x.x.x:6000) di klien.');

// Set untuk menyimpan semua klien WebSocket yang terhubung
const clients = new Set();

wss.on('connection', function connection(ws) {
    console.log(`\n🔗 Klien Web baru terhubung. Total klien: ${clients.size + 1}`);
    clients.add(ws); 
    
    // Logika Klien Terputus
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`❌ Klien Web terputus. Total klien sisa: ${clients.size}`);
    });

    // Logika Menerima Pesan dari Klien (Opsional, tapi penting)
    ws.on('message', (message) => {
        // Contoh: Klien mengirim pesan "SUBSCRIBE"
        console.log(`[CLIENT MSG] Diterima: ${message.toString()}`);
    });
});

// --- Fungsi untuk Mengirim Data ke Semua Klien Web ---
function broadcast(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// --- Koneksi ke RabbitMQ dan Konsumsi Pesan ---
amqp.connect(RABBITMQ_URL, function(error0, connection) {
    if (error0) {
        // Jika koneksi RabbitMQ gagal, tampilkan error dan keluar dari proses
        console.error("\n❌ GAGAL Koneksi RabbitMQ:", error0.message);
        return;
    }
    
    connection.createChannel(function(error1, channel) {
        if (error1) throw error1;

        // Pastikan Exchange sudah dideklarasikan
        channel.assertExchange(RABBITMQ_EXCHANGE, 'fanout', { durable: true });

        // 1. Deklarasikan Queue Realtime (nama acak, temporer)
        channel.assertQueue('', REALTIME_QUEUE_OPTIONS, function(error2, q) {
            if (error2) throw error2;

            // 2. Ikat Queue Realtime ke Exchange
            channel.bindQueue(q.queue, RABBITMQ_EXCHANGE, '');
            console.log(`\n✅ RabbitMQ Consumer berjalan. Menunggu data di Queue: ${q.queue}`);

            // 3. Mulai Mengonsumsi Pesan
            channel.consume(q.queue, function(msg) {
                if (msg.content) {
                    const payload = msg.content.toString();
                    
                    // Kirim data ke SEMUA klien WebSocket yang terhubung
                    broadcast(payload); 

                    console.log(`[⚡️ REALTIME] Menerima data dari RabbitMQ & dikirim ke ${clients.size} klien.`);
                    
                    // Konfirmasi pesan (ACK) agar RabbitMQ tahu pesan sudah diproses
                    channel.ack(msg); 
                }
            }, {
                noAck: false
            });
        });
    });
});
