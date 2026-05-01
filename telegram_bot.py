import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from telegram.error import BadRequest

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Bot token - Render environment variable
BOT_TOKEN = os.getenv("BOT_TOKEN", "")

# Channel and Group Configuration
MAIN_CHANNEL = "@SafeEscrowX"
MAIN_CHANNEL_LINK = "https://t.me/SafeEscrowX"
TUTORIAL_CHANNEL = "@SafeEscrowXTutorials"
TUTORIAL_CHANNEL_LINK = "https://t.me/SafeEscrowXTutorials"
GROUP_CHAT_LINK = "https://t.me/SafeEscrowX_chat"
SUPPORT_BOT = "@SafeEscrowXSupport_bot"
SUPPORT_BOT_LINK = "https://t.me/SafeEscrowXSupport_bot"
MINI_APP_URL = "https://safeescrowxx.netlify.app/"

async def check_subscription(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Check if user has joined both required channels."""
    user_id = update.effective_user.id
    
    try:
        member_main = await context.bot.get_chat_member(MAIN_CHANNEL, user_id)
        if member_main.status not in ['member', 'administrator', 'creator']:
            return False
        
        member_tutorial = await context.bot.get_chat_member(TUTORIAL_CHANNEL, user_id)
        if member_tutorial.status not in ['member', 'administrator', 'creator']:
            return False
        
        return True
    except Exception as e:
        logger.error(f"Error checking subscription: {e}")
        return False

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /start is issued."""
    user = update.effective_user
    
    is_subscribed = await check_subscription(update, context)
    
    if not is_subscribed:
        force_join_message = f"""
🔒 Access Restricted

To use SafeEscrowX bot, you must join our channels first:

📢 Main Channel: @SafeEscrowX
📚 Tutorial Channel: @SafeEscrowXTutorials

After joining both channels, click the button below to verify and access the bot.
        """
        
        keyboard = [
            [InlineKeyboardButton("✅ I've Joined Both Channels", callback_data="verify_subscription")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            text=force_join_message,
            reply_markup=reply_markup,
            disable_web_page_preview=True
        )
        return
    
    welcome_message = f"""
🌟 Welcome to SafeEscrowX, {user.first_name}! 🌟

SafeEscrowX is an automated escrow bot built to make online transactions faster, safer, and easier.

🚀 What you can do:
• Start secure escrow trades
• Protect buyer and seller
• Reduce delays with automation
• Access support when needed

Use the buttons below to open the app, join the community, or contact support.

Start trading safely with SafeEscrowX! 💫
    """
    
    keyboard = [
        [InlineKeyboardButton("🚀 Open SafeEscrowX App", url=MINI_APP_URL)],
        [InlineKeyboardButton("💬 Join Group Chat", url=GROUP_CHAT_LINK)],
        [InlineKeyboardButton("📢 Main Channel", url=MAIN_CHANNEL_LINK),
         InlineKeyboardButton("📚 Tutorials", url=TUTORIAL_CHANNEL_LINK)],
        [InlineKeyboardButton("🛟 Support", url=SUPPORT_BOT_LINK)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        text=welcome_message,
        reply_markup=reply_markup,
        disable_web_page_preview=True
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle button callbacks."""
    query = update.callback_query
    
    await query.answer()
    
    if query.data == "verify_subscription":
        is_subscribed = await check_subscription(update, context)
        
        if is_subscribed:
            keyboard = [
                [InlineKeyboardButton("🚀 Open SafeEscrowX App", url=MINI_APP_URL)]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            await query.edit_message_text(
                text="✅ Subscription Verified!\n\nYou now have full access to SafeEscrowX bot. Use /start to begin!",
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text(
                text="❌ Verification Failed\n\nPlease make sure you've joined BOTH channels:\n\n📢 @SafeEscrowX\n📚 @SafeEscrowXTutorials\n\nThen try again."
            )

def main() -> None:
    """Start the bot."""
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN is missing. Add BOT_TOKEN in Render environment variables.")

    application = Application.builder().token(BOT_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()