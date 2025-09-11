# Gunakan citra Node.js resmi sebagai base image
FROM node:18-alpine

# Set direktori kerja di dalam kontainer
WORKDIR /app

# Salin package.json dan package-lock.json (jika ada)
# Langkah ini untuk memanfaatkan caching Docker
COPY package*.json ./

# Instal semua dependensi Node.js, termasuk PM2 secara global
RUN npm install
RUN npm install -g pm2

# Salin semua file sumber aplikasi ke direktori kerja
COPY . .

# Paparkan port yang dibutuhkan oleh aplikasi Anda
EXPOSE 3000
EXPOSE 8080

# Perintah untuk menjalankan aplikasi menggunakan PM2
# PM2 akan mengawasi dan me-restart proses secara otomatis jika mati
CMD ["pm2-runtime", "start", "ecosystem.config.js"]