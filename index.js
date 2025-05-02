// Versi Webhook 
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Telegraf } = require("telegraf");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Ambil dari Railway environment variable
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("BOT_TOKEN dan CHAT_ID wajib diatur sebagai environment variable");
  process.exit(1);
}

// Tambahkan opsi webhookReply: false agar proses tidak error di Railway
const bot = new Telegraf(BOT_TOKEN, {
  telegram: { webhookReply: false }
});
let chatLog = [];

// Endpoint kirim pesan dari login page
app.post("/send", async (req, res) => {
  const { nama, pesan } = req.body;
  const teks = `[Login Page] ${nama}: ${pesan}`;
  try {
    await bot.telegram.sendMessage(CHAT_ID, teks);
    chatLog.push({ dari: nama, teks: pesan, waktu: new Date().toISOString() });
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Endpoint polling (untuk menampilkan chat di login page)
app.get("/poll", (req, res) => {
  res.json(chatLog.slice(-20));
});

// Simpan pesan masuk dari Telegram Group
bot.on("message", async (ctx) => {
  if (ctx.chat && ctx.chat.id == CHAT_ID && ctx.message.text) {
    chatLog.push({ dari: ctx.message.from.first_name || "Admin", teks: ctx.message.text, waktu: new Date().toISOString() });
  }
});

// Pasang webhook dari Railway otomatis
app.use(bot.webhookCallback("/webhook"));

// Cek koneksi di root URL
app.get("/", (req, res) => res.send("Smart Chat aktif dengan Webhook..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Smart Chat webhook aktif di port", PORT);
});
