// save-payload.js
const amqp = require('amqplib');
const { MongoClient } = require('mongodb');

const mongoUri = 'mongodb://mongodb:27017';
const rabbitmqUri = 'amqp://rabbitmq'; 
const queueName = 'data_queue';
const dbName = 'iot_data';
const collectionName = 'payloads';

async function connectToMongo() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Terhubung ke MongoDB');
    return client.db(dbName);
  } catch (error) {
    console.error('Gagal terhubung ke MongoDB:', error);
    process.exit(1);
  }
}

async function subscribeAndSave() {
  const db = await connectToMongo();
  const collection = db.collection(collectionName);

  try {
    const connection = await amqp.connect(rabbitmqUri);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });

    console.log('Menunggu pesan dari RabbitMQ...');
    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          const doc = {
            timestamp: new Date(),
            ...payload
          };

          const result = await collection.insertOne(doc);
          console.log(`Data berhasil disimpan ke MongoDB dengan ID: ${result.insertedId}`);
          channel.ack(msg);
        } catch (error) {
          console.error('Gagal memproses pesan atau menyimpan ke database:', error);
          channel.reject(msg, false);
        }
      }
    });
  } catch (error) {
    console.error('Gagal terhubung atau mengonsumsi dari RabbitMQ:', error);
    process.exit(1);
  }
}

subscribeAndSave();