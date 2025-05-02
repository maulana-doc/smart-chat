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
  console.error("BOT_TOKEN, CHAT_ID, dan WEBHOOK_URL wajib diatur sebagai environment variable");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN, {
  telegram: { webhookReply: false }
});

// Penyimpanan per-user
const chatLogPerUser = {};

// Kirim pesan dari login page ke Telegram
app.post("/send", async (req, res) => {
  const { id, nama, pesan, sistem } = req.body;
  if (!id || !nama || !pesan) return res.status(400).send("Data tidak lengkap");

  // Simpan pesan di memori
  if (!chatLogPerUser[id]) chatLogPerUser[id] = [];
  chatLogPerUser[id].push({
    dari: nama,
    teks: pesan,
    waktu: new Date().toISOString()
  });

  // Format untuk Telegram
  const teks = sistem
    ? `[AUTO] Info dari ${nama}:\n${pesan}`
    : `💬 ChatID: ${id}\n${nama}:\n${pesan}`;

  try {
    await bot.telegram.sendMessage(CHAT_ID, teks);
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim ke Telegram:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Ambil chat berdasarkan ID pengguna
app.get("/poll", (req, res) => {
  const id = req.query.id;
  if (!id || !chatLogPerUser[id]) return res.json([]);
  res.json(chatLogPerUser[id].slice(-30));
});

// Deteksi balasan admin (berisi ChatID)
bot.on("text", async (ctx) => {
  if (ctx.chat.id != CHAT_ID) return;

  const pesan = ctx.message.text;
  const regex = /ChatID:\s*(\d+)/i;
  const match = pesan.match(regex);
  if (!match) return;

  const userId = match[1];
  const balasan = pesan.replace(regex, "").trim();
  const dari = ctx.message.from.first_name || "Admin";

  if (!chatLogPerUser[userId]) chatLogPerUser[userId] = [];
  chatLogPerUser[userId].push({
    dari,
    teks: balasan,
    waktu: new Date().toISOString()
  });
});

// Jalankan webhook
app.use(bot.webhookCallback("/webhook"));
const fullWebhook = `${WEBHOOK_URL}/webhook`;

bot.telegram.setWebhook(fullWebhook)
  .then(() => console.log("Webhook diatur ke:", fullWebhook))
  .catch((err) => console.error("Gagal set webhook:", err.message));

app.get("/", (req, res) => res.send("Smart Chat aktif dengan Webhook..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Smart Chat webhook aktif di port", PORT);
});
