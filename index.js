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

const chatLogPerUser = {};

// Endpoint untuk kirim pesan dari login page
app.post("/send", async (req, res) => {
  const { id, nama, pesan, sistem } = req.body;
  if (!id || !nama || !pesan) return res.status(400).send("Data tidak lengkap");

  if (!chatLogPerUser[id]) chatLogPerUser[id] = [];
  chatLogPerUser[id].push({
    dari: nama,
    teks: pesan,
    waktu: new Date().toISOString()
  });

  const teks = sistem
    ? `[AUTO] Info dari ${nama}:\n${pesan}`
    : `ChatID: ${id}\n${nama}:\n${pesan}`;

  try {
    await bot.telegram.sendMessage(CHAT_ID, teks);
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim ke Telegram:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Endpoint polling
app.get("/poll", (req, res) => {
  const id = req.query.id;
  if (!id || !chatLogPerUser[id]) return res.json([]);
  res.json(chatLogPerUser[id].slice(-30));
});

// Balasan dari admin di grup
bot.on("text", async (ctx) => {
  if (ctx.chat.id !== parseInt(CHAT_ID)) return;

  let targetId = null;

  // Jika membalas pesan (reply), ambil dari teks yang dibalas
  if (ctx.message.reply_to_message) {
    const teksAsli = ctx.message.reply_to_message.text;
    const match = teksAsli.match(/ChatID:\s*(\d+)/);
    if (match) targetId = match[1];
  }

  // Jika tidak reply atau gagal ambil ID → abaikan
  if (!targetId) return;

  const namaAdmin = ctx.message.from.first_name || "Admin";
  const isiPesan = ctx.message.text;

  if (!chatLogPerUser[targetId]) chatLogPerUser[targetId] = [];
  chatLogPerUser[targetId].push({
    dari: namaAdmin,
    teks: isiPesan,
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
