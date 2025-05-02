// Versi Webhook: Chat Telegram Smart Solution (Per-User)
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
  telegram: { webhookReply: false },
});

const chatLog = {}; // { userID: [ { dari, teks, waktu } ] }

// Endpoint kirim pesan dari login page
app.post("/send", async (req, res) => {
  const { nama, pesan, id, sistem } = req.body;

  if (!id || !pesan) return res.status(400).send("Data tidak lengkap");

  const teks = sistem
    ? `[SYSTEM][${id}]\n${pesan}`
    : `[${id}] ${nama}:\n${pesan}`;

  try {
    if (!chatLog[id]) chatLog[id] = [];
    await bot.telegram.sendMessage(CHAT_ID, teks);

    chatLog[id].push({
      dari: nama,
      teks: pesan,
      waktu: new Date().toISOString(),
      sistem: !!sistem,
    });

    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Endpoint polling (khusus user)
app.get("/poll", (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send("ID tidak ditemukan");
  res.json((chatLog[id] || []).slice(-20));
});

// Bot membaca balasan admin (reply di Telegram group)
bot.on("text", (ctx) => {
  const text = ctx.message.text;
  const from = ctx.message.from.first_name || "Admin";

  const match = text.match(/(\d{5,})/);
  const userID = match ? match[1] : null;

  if (userID && chatLog[userID]) {
    chatLog[userID].push({
      dari: from,
      teks: text.replace(`[${userID}]`, '').trim(),
      waktu: new Date().toISOString(),
    });
  }
});

// Webhook
app.use(bot.webhookCallback("/webhook"));
bot.telegram.setWebhook(process.env.WEBHOOK_URL + "/webhook");

app.get("/", (req, res) => res.send("Smart Chat aktif dengan Webhook..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Smart Chat webhook aktif di port", PORT);
});
