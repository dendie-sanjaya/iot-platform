# Gunakan citra Node.js resmi sebagai base image
FROM node:18-alpine

# Set direktori kerja di dalam kontainer
WORKDIR /app

# Salin package.json dan package-lock.json terlebih dahulu
# Ini memanfaatkan cache Docker dan mempercepat proses build
# COPY package*.json ./

# Instal semua dependensi
#RUN npm install
#RUN npm install -g pm2

# Salin sisa kode aplikasi
#COPY . .

# Paparkan port yang dibutuhkan
#EXPOSE 3000
#EXPOSE 8080

# Perintah untuk menjalankan aplikasi
# CMD ["pm2-runtime", "start", "ecosystem.config.js"]