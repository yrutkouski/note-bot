import { webhookCallback } from 'grammy';
import { HttpFunction } from '@google-cloud/functions-framework';
import bot from './bot.js';

export const webhook: HttpFunction = webhookCallback(
  bot,
  'express',
  { secretToken: process.env.X_TOKEN! }
);
