// Import library yang dibutuhkan
const express = require("express");
const bodyParser = require("body-parser");
const { Telegraf } = require("telegraf");

// Inisialisasi server Express
const app = express();
app.use(bodyParser.json());

// Ambil token bot & ID grup dari environment variable Railway
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.CHAT_ID ? parseInt(process.env.CHAT_ID) : null;

// Validasi variabel lingkungan wajib
if (!BOT_TOKEN || !GROUP_CHAT_ID) {
  console.error("BOT_TOKEN dan CHAT_ID wajib diatur sebagai environment variable");
  process.exit(1);
}

// Inisialisasi bot Telegram
const bot = new Telegraf(BOT_TOKEN);
let chatLog = []; // Penyimpanan chat sementara

// Endpoint POST: menerima pesan dari login page
app.post("/send", async (req, res) => {
  const { nama, pesan } = req.body;
  if (!pesan || !nama) return res.status(400).send("Isi nama dan pesan");

  // Format pesan yang dikirim ke grup Telegram
  const teks = `[Login Page] ${nama}:
${pesan}`;
  try {
    await bot.telegram.sendMessage(GROUP_CHAT_ID, teks);
    chatLog.push({ dari: nama, teks: pesan, waktu: new Date().toISOString() });
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Endpoint GET: polling untuk ambil balasan terbaru ke login page
app.get("/poll", (req, res) => {
  res.json(chatLog.slice(-20));
});

// Bot menangkap semua balasan dari grup dan menyimpannya
bot.on("text", async (ctx) => {
  if (ctx.chat.id === GROUP_CHAT_ID && ctx.message.text) {
    const dari = ctx.message.from.first_name || "Admin";
    const teks = ctx.message.text;
    chatLog.push({
      dari: dari,
      teks: teks,
      waktu: new Date().toISOString()
    });
  }
});

// Jalankan bot dan server
bot.launch();
app.listen(process.env.PORT || 3000, () => {
  console.log("Smart Chat aktif di Railway...");
});
