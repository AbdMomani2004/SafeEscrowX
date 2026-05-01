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

# Bot token - Replace with your actual bot token
BOT_TOKEN = "8336733967:AAGyTes8Bnq1zXvcoIdv7t8PC6j-4AM_UbU"

# Channel and Group Configuration
MAIN_CHANNEL = "@SafeEscrowX"
MAIN_CHANNEL_LINK = "https://t.me/SafeEscrowX"
TUTORIAL_CHANNEL = "@SafeEscrowXTutorials"
TUTORIAL_CHANNEL_LINK = "https://t.me/SafeEscrowXTutorials"
GROUP_CHAT_LINK = "https://t.me/SafeEscrowX_chat"
SUPPORT_BOT = "@SafeEscrowXSupport_bot"

async def check_subscription(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Check if user has joined both required channels."""
    user_id = update.effective_user.id
    
    try:
        # Check main channel subscription
        member_main = await context.bot.get_chat_member(MAIN_CHANNEL, user_id)
        if member_main.status in ['left', 'kicked']:
            return False
        
        # Check tutorial channel subscription
        member_tutorial = await context.bot.get_chat_member(TUTORIAL_CHANNEL, user_id)
        if member_tutorial.status in ['left', 'kicked']:
            return False
        
        return True
    except Exception as e:
        logger.error(f"Error checking subscription: {e}")
        return False

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /start is issued."""
    user = update.effective_user
    
    # Check if user has joined required channels
    is_subscribed = await check_subscription(update, context)
    
    if not is_subscribed:
        # User hasn't joined channels - show force join message
        force_join_message = f"""
🔒 **Access Restricted**

To use SafeEscrowX bot, you must join our channels first:

📢 **Main Channel**: [@SafeEscrowX]({MAIN_CHANNEL_LINK})
📚 **Tutorial Channel**: [@SafeEscrowXTutorials]({TUTORIAL_CHANNEL_LINK})

After joining both channels, click the button below to verify and access the bot.
        """
        
        keyboard = [
            [InlineKeyboardButton("✅ I've Joined Both Channels", callback_data="verify_subscription")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            text=force_join_message,
            reply_markup=reply_markup,
            parse_mode='Markdown',
            disable_web_page_preview=True
        )
        return
    
    # User is subscribed - show welcome message
    welcome_message = f"""
🌟 **Welcome to SafeEscrowX, {user.first_name}!** 🌟

Your trusted escrow service for secure transactions!

🚀 **Features:**
• Secure cryptocurrency escrow
• Protected peer-to-peer trades
• Dispute resolution system
• 24/7 automated service

💬 **Join Our Community:**
• Group Chat: [SafeEscrowX Chat]({GROUP_CHAT_LINK})
• Main Channel: [@SafeEscrowX]({MAIN_CHANNEL_LINK})
• Tutorials: [@SafeEscrowXTutorials]({TUTORIAL_CHANNEL_LINK})

🛟 **Need Help?**
Contact our support bot: {SUPPORT_BOT}

Start trading safely with SafeEscrowX! 💫
    """
    
    # Create inline keyboard with all links
    keyboard = [
        [InlineKeyboardButton("💬 Join Group Chat", url=GROUP_CHAT_LINK)],
        [InlineKeyboardButton("📢 Main Channel", url=MAIN_CHANNEL_LINK),
         InlineKeyboardButton("📚 Tutorials", url=TUTORIAL_CHANNEL_LINK)],
        [InlineKeyboardButton("🛟 Support", url=f"https://t.me/SafeEscrowXSupport_bot")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Send message with image
    image_url = "https://via.placeholder.com/400x200/4CAF50/FFFFFF?text=Welcome+to+SafeEscrowX"
    
    try:
        await update.message.reply_photo(
            photo=image_url,
            caption=welcome_message,
            reply_markup=reply_markup,
            parse_mode='Markdown',
            disable_web_page_preview=True
        )
    except Exception as e:
        # Fallback to text message if image fails
        logger.error(f"Error sending image: {e}")
        await update.message.reply_text(
            text=welcome_message,
            reply_markup=reply_markup,
            parse_mode='Markdown',
            disable_web_page_preview=True
        )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle button callbacks."""
    query = update.callback_query
    
    # Acknowledge the button press
    await query.answer()
    
    if query.data == "verify_subscription":
        # Re-check subscription status
        is_subscribed = await check_subscription(update, context)
        
        if is_subscribed:
            await query.edit_message_text(
                text="✅ **Subscription Verified!**\n\nYou now have full access to SafeEscrowX bot. Use /start to begin!",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text(
                text="❌ **Verification Failed**\n\nPlease make sure you've joined BOTH channels:\n\n📢 @SafeEscrowX\n📚 @SafeEscrowXTutorials\n\nThen try again.",
                parse_mode='Markdown'
            )

def main() -> None:
    """Start the bot."""
    # Create the Application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Register handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Run the bot until the user presses Ctrl-C
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
