const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Разрешаем всем (включая Firebase) брать файлы

// Раздаем статические файлы из папки public
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Scarab Engine Asset Server is Running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
