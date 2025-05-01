const express = require("express");
const bodyParser = require("body-parser");
const { Telegraf } = require("telegraf");

const app = express();
app.use(bodyParser.json());

// Bot Telegram Bapak
const BOT_TOKEN = "8004132695:AAFs7RVKOgUnyP7O9KAA9eftR0J0jNhK6nA";
const GROUP_CHAT_ID = -1002527354271;

const bot = new Telegraf(BOT_TOKEN);
let chatLog = [];

// Endpoint untuk menerima pesan dari login page
app.post("/send", async (req, res) => {
  const { nama, pesan } = req.body;
  if (!pesan || !nama) return res.status(400).send("Isi nama dan pesan");
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

// Endpoint polling pesan untuk ditampilkan di login page
app.get("/poll", (req, res) => {
  res.json(chatLog.slice(-20));
});

// Bot mendengarkan balasan dari grup dan simpan
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

bot.launch();
app.listen(process.env.PORT || 3000, () => {
  console.log("Smart Chat aktif di Railway...");
});
