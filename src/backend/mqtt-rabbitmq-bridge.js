// mqtt-rabbitmq-bridge.js

const mqtt = require('mqtt');
const amqp = require('amqplib/callback_api'); // Pustaka RabbitMQ

// 1. Detail Koneksi
const MQTT_HOST = 'mqtt://localhost';
const MQTT_TOPIC = 'iot/data/#'; // Berlangganan ke semua data IoT
const RABBITMQ_URL = 'amqp://localhost';
const RABBITMQ_EXCHANGE = 'iot_data_exchange'; // Tentukan Exchange di RabbitMQ

// 2. Hubungkan ke RabbitMQ
amqp.connect(RABBITMQ_URL, function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        // Deklarasikan Exchange
        channel.assertExchange(RABBITMQ_EXCHANGE, 'fanout', {
            durable: true // Exchange tetap ada meski RabbitMQ restart
        });

        console.log("✅ Koneksi RabbitMQ berhasil. Menunggu pesan MQTT...");
        
        // 3. Hubungkan ke MQTT Broker
        const client = mqtt.connect(MQTT_HOST);

        client.on('connect', function () {
            client.subscribe(MQTT_TOPIC, function (err) {
                if (!err) {
                    console.log(`✅ Berlangganan ke topik MQTT: ${MQTT_TOPIC}`);
                }
            });
        });

        // 4. Terima Pesan MQTT dan Teruskan ke RabbitMQ
        client.on('message', function (topic, message) {
            // Data dari MQTT berupa Buffer, ubah ke String
            const payload = message.toString(); 
            
            // Kirim payload ke RabbitMQ
            // Routing Key dikosongkan karena menggunakan Exchange tipe 'fanout'
            channel.publish(RABBITMQ_EXCHANGE, '', Buffer.from(payload)); 
            
            console.log(`➡️ Diterima dari MQTT topic: ${topic}`);
            console.log(`   Dikirim ke RabbitMQ Exchange: ${RABBITMQ_EXCHANGE} | Payload: ${payload.substring(0, 50)}...`);
        });

        client.on('error', function (error) {
            console.error('❌ Kesalahan pada MQTT:', error.message);
        });
    });
});