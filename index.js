const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Telegraf } = require("telegraf");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN || !CHAT_ID || !WEBHOOK_URL) {
  console.error("BOT_TOKEN, CHAT_ID, dan WEBHOOK_URL wajib diatur");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN, {
  telegram: { webhookReply: false }
});

// Struktur per-user
const chatLogPerUser = {};

// Kirim dari login page
app.post("/send", async (req, res) => {
  const { id, nama, pesan, sistem } = req.body;
  if (!id || !nama || !pesan) return res.status(400).send("Data tidak lengkap");

  if (!chatLogPerUser[id]) chatLogPerUser[id] = [];
  chatLogPerUser[id].push({ dari: nama, teks: pesan, waktu: new Date().toISOString() });

  const teks = sistem
    ? `[AUTO] Info dari ${nama}:\n${pesan}`
    : `🟡ChatID: ${id}\n${nama}:\n${pesan}`;

  try {
    await bot.telegram.sendMessage(CHAT_ID, teks);
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim ke Telegram:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Ambil pesan per user
app.get("/poll", (req, res) => {
  const id = req.query.id;
  if (!id || !chatLogPerUser[id]) return res.json([]);
  res.json(chatLogPerUser[id].slice(-30));
});

// Tangkap balasan dari grup
bot.on("text", (ctx) => {
  if (ctx.chat.id != CHAT_ID) return;
  const teks = ctx.message.text;
  const match = teks.match(/ChatID:\s*(\d+)/);
  if (!match) return;

  const targetId = match[1];
  const namaAdmin = ctx.message.from.first_name || "Admin";
  const pesan = teks.replace(/🟡ChatID:\s*\d+\n?/i, "").trim();

  if (!chatLogPerUser[targetId]) chatLogPerUser[targetId] = [];
  chatLogPerUser[targetId].push({ dari: namaAdmin, teks: pesan, waktu: new Date().toISOString() });
});

// Webhook endpoint
app.use(bot.webhookCallback("/webhook"));

// Jalankan express dan set webhook
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await bot.telegram.setWebhook(`${WEBHOOK_URL}/webhook`);
    console.log("Smart Chat webhook aktif di port", PORT);
  } catch (err) {
    console.error("Gagal set webhook:", err.message);
  }
});

// Cek halaman utama
app.get("/", (req, res) => res.send("Smart Chat aktif dengan Webhook..."));
