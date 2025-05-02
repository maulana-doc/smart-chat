const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Telegraf } = require("telegraf");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("BOT_TOKEN dan CHAT_ID wajib diatur sebagai environment variable");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN, {
  telegram: { webhookReply: false }
});

// Objek untuk menyimpan chat per user
const chatLogPerUser = {};

// Endpoint untuk menerima pesan dari user
app.post("/send", async (req, res) => {
  const { id, nama, pesan, sistem } = req.body;
  if (!id || !nama || !pesan) return res.status(400).send("Data tidak lengkap");

  // Simpan ke memory lokal
  if (!chatLogPerUser[id]) chatLogPerUser[id] = [];
  chatLogPerUser[id].push({
    dari: nama,
    teks: pesan,
    waktu: new Date().toISOString()
  });

  // Format pesan ke Telegram
  const teks = sistem
    ? `[AUTO] Info dari ${nama}:\n${pesan}`
    : `[ChatID: ${id}]\n${nama}:\n${pesan}`;

  try {
    await bot.telegram.sendMessage(CHAT_ID, teks);
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim ke Telegram:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Endpoint polling dari frontend
app.get("/poll", (req, res) => {
  const id = req.query.id;
  if (!id || !chatLogPerUser[id]) return res.json([]);
  res.json(chatLogPerUser[id].slice(-30)); // kirim maksimal 30 terakhir
});

// Bot mendengarkan balasan admin dari grup
bot.on("text", async (ctx) => {
  if (ctx.chat.id != CHAT_ID) return;
  const teks = ctx.message.text;
  const match = teks.match(/ChatID:\s*(\d+)/);
  if (!match) return; // tidak ada ID target, lewati

  const targetId = match[1];
  const namaAdmin = ctx.message.from.first_name || "Admin";
  const pesan = teks.replace(/ChatID:\s*\d+\s*/i, ""); // hapus tag ID dari pesan

  if (!chatLogPerUser[targetId]) chatLogPerUser[targetId] = [];
  chatLogPerUser[targetId].push({
    dari: namaAdmin,
    teks: pesan,
    waktu: new Date().toISOString()
  });
});

app.use(bot.webhookCallback("/webhook"));
bot.telegram.setWebhook(process.env.WEBHOOK_URL + "/webhook");

app.get("/", (req, res) => res.send("Smart Chat aktif dengan Webhook..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Smart Chat webhook aktif di port", PORT);
}); 
