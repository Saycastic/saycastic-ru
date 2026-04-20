# Telegram Groq Voice Bot

Minimal Telegram bot that transcribes voice messages with Groq.

## Setup

1. Copy `.env.example` to `.env`
2. Fill in `TELEGRAM_BOT_TOKEN` and `GROQ_API_KEY`
3. Install deps:
   ```bash
   npm install
   ```
4. Start:
   ```bash
   npm start
   ```

## Notes

- Default transcription model: `whisper-large-v3`
- The bot replies with the transcript of any voice message
