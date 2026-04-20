import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { Telegraf } from 'telegraf';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const groqKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || 'whisper-large-v3';

if (!botToken) throw new Error('Missing TELEGRAM_BOT_TOKEN');
if (!groqKey) throw new Error('Missing GROQ_API_KEY');

const bot = new Telegraf(botToken);

async function downloadTelegramFile(fileId) {
  const fileLink = await bot.telegram.getFileLink(fileId);
  const res = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
  const tmpPath = path.join(os.tmpdir(), `voice-${Date.now()}.ogg`);
  await fs.writeFile(tmpPath, Buffer.from(res.data));
  return tmpPath;
}

async function transcribeWithGroq(filePath) {
  const form = new FormData();
  form.append('file', new Blob([await fs.readFile(filePath)]), path.basename(filePath));
  form.append('model', groqModel);
  form.append('language', 'ru');
  form.append('response_format', 'json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.text || '(empty transcription)';
}

bot.on('voice', async ctx => {
  let filePath;
  try {
    await ctx.reply('Секунду, расшифровываю...');
    filePath = await downloadTelegramFile(ctx.message.voice.file_id);
    const text = await transcribeWithGroq(filePath);
    await ctx.reply(text);
  } catch (err) {
    console.error(err);
    await ctx.reply('Не получилось расшифровать голосовое.');
  } finally {
    if (filePath) await fs.unlink(filePath).catch(() => {});
  }
});

async function main() {
  try {
    await bot.launch();
    console.log('Bot started');
  } catch (err) {
    if (err?.response?.error_code === 409) {
      console.error('Telegram already has an active getUpdates session for this token. Stop the other bot instance, then restart here.');
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
