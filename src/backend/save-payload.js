// save-payload.js

const amqp = require('amqplib/callback_api');
const { MongoClient } = require('mongodb');

// --- DETAIL KONEKSI ---
// Ganti nilai-nilai ini sesuai dengan konfigurasi lingkungan Anda
const RABBITMQ_URL = 'amqp://localhost:5672'; // Ganti port jika berbeda
const RABBITMQ_EXCHANGE = 'iot_data_exchange';
const RABBITMQ_QUEUE = 'timeseries_queue'; 

const MONGODB_URI = 'mongodb://localhost:27017'; // Ganti port jika berbeda
const DB_NAME = 'iot_platform_db';
const COLLECTION_NAME = 'sensor_readings'; 

// --- FUNGSI UTAMA ---
async function startConsumer() {
    let mongoClient;

    try {
        // 1. Hubungkan ke MongoDB
        mongoClient = await MongoClient.connect(MONGODB_URI);
        const db = mongoClient.db(DB_NAME);
        
        // Membuat koleksi Timeseries (atau memastikan sudah ada)
        await db.createCollection(COLLECTION_NAME, {
            timeseries: {
                timeField: "timestamp",
                metaField: "metadata",
                granularity: "minutes" // Granularity untuk Timeseries
            }
        }).catch(err => {
             // Abaikan error jika koleksi sudah ada
             if (err.codeName !== 'NamespaceExists') throw err;
        });

        const collection = db.collection(COLLECTION_NAME);
        console.log("✅ Berhasil terhubung ke MongoDB Timeseries.");


        // 2. Hubungkan ke RabbitMQ
        amqp.connect(RABBITMQ_URL, function(error0, connection) {
            if (error0) throw error0;
            
            connection.createChannel(function(error1, channel) {
                if (error1) throw error1;

                // Deklarasikan Exchange (untuk memastikan ada, meski sudah dilakukan di bridge)
                channel.assertExchange(RABBITMQ_EXCHANGE, 'fanout', { durable: true });

                // Deklarasikan Queue baru dan atur agar Queue tidak hilang saat RabbitMQ restart
                channel.assertQueue(RABBITMQ_QUEUE, { durable: true }, function(error2, q) {
                    if (error2) throw error2;

                    // Mengikat Queue ke Exchange agar menerima pesan yang dikirim oleh bridge
                    channel.bindQueue(q.queue, RABBITMQ_EXCHANGE, '');
                    console.log(`✅ Menunggu pesan dari RabbitMQ Queue: ${q.queue}`);
                    
                    // 3. Mulai Mengonsumsi Pesan
                    channel.consume(q.queue, async function(msg) {
                        if (msg.content) {
                            try {
                                const rawPayload = msg.content.toString();
                                const data = JSON.parse(rawPayload);
                                
                                // Asumsi payload JSON dari MQTT: 
                                // { "timestamp":"...", "temperature":"...", "humidity":"...", "deviceId":"sensor_ruang_001" }
                                
                                // Ekstrak deviceId dari topik atau jika tidak ada, gunakan nilai default
                                const deviceId = data.deviceId || 'unknown_device';

                                // 4. Transformasi Data dan Simpan ke MongoDB
                                const doc = {
                                    timestamp: new Date(data.timestamp), // TimeField (wajib Date object)
                                    metadata: { 
                                        deviceId: deviceId, 
                                    }, 
                                    temperature: parseFloat(data.temperature),
                                    humidity: parseFloat(data.humidity)
                                };

                                await collection.insertOne(doc);
                                console.log(`[💾] Data sensor ${deviceId} tersimpan: ${doc.temperature}°C / ${doc.humidity}%`);
                                
                                // Mengirim sinyal ACK (Acknowledgement) ke RabbitMQ 
                                // untuk menghapus pesan dari Queue (berarti data sudah aman tersimpan)
                                channel.ack(msg); 

                            } catch (e) {
                                console.error('❌ Error saat memproses atau menyimpan data:', e.message);
                                // Mengirim sinyal NACK (Negative Acknowledgement) ke RabbitMQ
                                channel.nack(msg); 
                            }
                        }
                    }, {
                        noAck: false // Penting: Jangan hapus pesan sebelum di-ACK
                    });
                });
            });
        });

    } catch (e) {
        console.error("❌ Gagal memulai consumer atau koneksi database:", e.message);
        if (mongoClient) mongoClient.close();
    }
}

startConsumer();