import { Bot, webhookCallback } from 'grammy';
import { HttpFunction, Request, Response } from '@google-cloud/functions-framework';

const {
  BOT_TOKEN,
  X_TOKEN,
} = process.env;

const bot = new Bot(BOT_TOKEN!);

// temp logger
bot.use((ctx, next) => {
  console.error(JSON.stringify(ctx.update, null, 2));
  return next();
});

bot.on('message:text', (ctx) => ctx.reply(`You said: ${ctx.message.text}`));

const handler = webhookCallback(bot, 'express', { secretToken: X_TOKEN! });

export const webhook: HttpFunction = (req, res) => handler(req, res);
