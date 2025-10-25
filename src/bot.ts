import { Bot, Context as GrammyContext, session, SessionFlavor } from 'grammy';
import { Message, Update } from '@grammyjs/types';
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from '@grammyjs/conversations';

interface SessionData {}

type Context =
  GrammyContext
  & SessionFlavor<SessionData>
  & ConversationFlavor<GrammyContext & SessionFlavor<SessionData>>;

type EditedMessage = true | Update.Edited & Message.CommonMessage

const bot = new Bot<Context>(process.env.BOT_TOKEN!);

bot.use(session({
  initial: (): SessionData => ({})
}));
bot.use(conversations());

async function withErrorLabel<T>(
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(`[${label}] ${error}`);
  }
}

const addNote = async (conversation: Conversation<Context, Context>, ctx: Context): Promise<void> => {
  const messagesToDelete: number[] = [];
  let initialMsg;

  try {
    await withErrorLabel<boolean>(
      'init_delete',
      () => ctx.deleteMessage()
    );

    const initialNote = '<<<Fill note>>>';
    const msg = await ctx.reply(initialNote);
    initialMsg = msg;

    const title = await conversation.waitFor('message:text');
    messagesToDelete.push(title.message.message_id);

    const link = await conversation.waitFor('message:text');
    messagesToDelete.push(link.message.message_id);

    const desc = await conversation.waitFor('message:text');
    messagesToDelete.push(desc.message.message_id);

    const formattedTitle = `*${title.message.text}*`;
    const formattedLinks = link.message.text!
    .split('\n')
    .filter(l => l.trim())
    .filter(line => {
      try {
        new URL(line.trim());
        return true;
      } catch {
        return false;
      }
    })
    .map((url) => `[🔗🔗🔗🔗🔗](${url.trim()})`)
    .join('\n');
    const formattedDesc = `\`${desc.message.text}\``;

    await withErrorLabel<EditedMessage>(
      'final_edit',
      () => ctx.api.editMessageText(
        ctx.chat!.id,
        msg.message_id,
        `${formattedTitle}\n\n${formattedLinks ? `${formattedLinks}\n\n` : ''}${formattedDesc}`,
        {
          parse_mode: 'MarkdownV2',
          link_preview_options: { is_disabled: true }
        })
    );

    for (const messageId of messagesToDelete) {
      await ctx.api.deleteMessage(ctx.chat!.id, messageId);
    }
  } catch (error) {
    for (const messageId of messagesToDelete) {
      await ctx.api.deleteMessage(ctx.chat!.id, messageId);
    }
    if (initialMsg) {
      await ctx.api.deleteMessage(ctx.chat!.id, initialMsg.message_id);
    }

    throw error;
  }
};

bot.use(createConversation(addNote));

bot.on('message:text', async (ctx) => ctx.conversation.enter('addNote'));

bot.catch((err) => {
  console.error(`Error while handling update ${err.ctx.update.update_id}:`, err.error);
});

export default bot;
