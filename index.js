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
  console.error("BOT_TOKEN dan CHAT_ID wajib diatur");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN, {
  telegram: { webhookReply: false }
});

let chatLog = [];

// Kirim pesan dari pengguna ke grup Telegram
app.post("/send", async (req, res) => {
  const { nama, pesan } = req.body;
  if (!nama || !pesan) return res.status(400).send("Nama dan pesan wajib diisi");

  const teks = `[Login Page] ${nama}:\n${pesan}`;
  try {
    await bot.telegram.sendMessage(Number(CHAT_ID), teks);
    chatLog.push({ dari: nama, teks: pesan, waktu: new Date().toISOString() });
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});

// Terima polling chat untuk ditampilkan ke pengguna
app.get("/poll", (req, res) => {
  res.json(chatLog.slice(-20));
});

// Terima info awal pengguna (MAC, IP, dll)
app.post("/info", async (req, res) => {
  const { mac, ip, userAgent } = req.body;
  const teks = `[Login Info Detected]\nIP: ${ip}\nMAC: ${mac}\nUser-Agent: ${userAgent}`;
  try {
    await bot.telegram.sendMessage(Number(CHAT_ID), teks);
    res.send("Info terkirim");
  } catch (err) {
    console.error("Gagal kirim info:", err.message);
    res.status(500).send("Gagal mengirim info");
  }
});

// Catat balasan admin dari Telegram
bot.on("message", async (ctx) => {
  try {
    if (
      ctx.chat &&
      Number(ctx.chat.id) === Number(CHAT_ID) &&
      ctx.message &&
      ctx.message.text &&
      !ctx.message.from.is_bot
    ) {
      const dari = ctx.message.from.first_name || "Admin";
      const teks = ctx.message.text;
      chatLog.push({ dari, teks, waktu: new Date().toISOString() });
    }
  } catch (err) {
    console.error("Gagal menyimpan balasan:", err.message);
  }
});

app.use(bot.webhookCallback("/webhook"));

app.get("/", (req, res) => res.send("Smart Chat aktif..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Smart Chat aktif di port", PORT);
});

// Hanya bagian tambahan pada endpoint /send
app.post("/send", async (req, res) => {
  const { nama, pesan, sistem } = req.body;

  if (!nama || !pesan) return res.status(400).send("Nama dan pesan wajib diisi");

  const teks = sistem
    ? `[Sistem Info Login Page]\n${pesan}`
    : `[Login Page] ${nama}:\n${pesan}`;

  try {
    await bot.telegram.sendMessage(Number(CHAT_ID), teks);
    if (!sistem) {
      chatLog.push({ dari: nama, teks: pesan, waktu: new Date().toISOString() });
    }
    res.send("Pesan terkirim");
  } catch (err) {
    console.error("Gagal kirim:", err.message);
    res.status(500).send("Gagal mengirim");
  }
});
