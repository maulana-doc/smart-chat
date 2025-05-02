// Smart Chat Telegram — Versi Final Webhook
// Kebutuhan: Chat dari login page → grup Telegram → dibalas bot/admin → tampil di login page

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Telegraf } = require("telegraf");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Token & Chat ID dari environment Railway
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("BOT_TOKEN dan CHAT_ID wajib diatur sebagai environment variable");
  process.exit(1);
}

// Bot utama (Hotspot-admin-bot)
const bot = new Telegraf(BOT_TOKEN, {
  telegram: { webhookReply: false }
});

let chatLog = [];

// Endpoint kirim pesan dari login page ke grup Telegram
app.post("/send", async (req, res) => {
  const { nama, pesan } = req.body;
  if (!nama || !pesan) return res.status(400).send("Nama dan pesan wajib diisi");

  const teks = `[Login Page] ${nama}:
${pesan}`;
  try {
    await bot.telegram.sendMessage(Number(CHAT_ID), teks);
    chatLog.push({ dari: nama, teks: pesan, waktu: new Date().toISOString() });
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Endpoint polling untuk login page ambil chat terakhir
app.get("/poll", (req, res) => {
  res.json(chatLog.slice(-20));
});

// Mencatat balasan admin/bot dari grup Telegram
bot.on("message", async (ctx) => {
  try {
    // Hanya ambil pesan teks dari grup target
    if (
      ctx.chat &&
      Number(ctx.chat.id) === Number(CHAT_ID) &&
      ctx.message &&
      ctx.message.text &&
      !ctx.message.from.is_bot // hindari loop dari bot sendiri
    ) {
      const dari = ctx.message.from.first_name || "Admin";
      const teks = ctx.message.text;
      chatLog.push({ dari, teks, waktu: new Date().toISOString() });
    }
  } catch (err) {
    console.error("Gagal menyimpan balasan:", err.message);
  }
});

// Webhook
app.use(bot.webhookCallback("/webhook"));

// Cek status bot
app.get("/", (req, res) => res.send("Smart Chat aktif dengan Webhook..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Smart Chat webhook aktif di port", PORT);
});
