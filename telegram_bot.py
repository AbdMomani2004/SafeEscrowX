import os
import logging
from pathlib import Path
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from telegram.error import BadRequest
from telegram.constants import ParseMode

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

def load_env_file(path: Path) -> None:
    """Minimal .env loader so bot works without extra dependencies."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


PROJECT_ROOT = Path(__file__).resolve().parent
load_env_file(PROJECT_ROOT / '.env')
load_env_file(PROJECT_ROOT / 'escrowx-backend' / '.env')

BOT_PROFILE = os.getenv("TELEGRAM_BOT_PROFILE", "main").strip().lower()

def resolve_bot_token() -> str:
    """Resolve bot token by profile while preserving legacy env compatibility."""
    if BOT_PROFILE == "admin":
        return (
            os.getenv("ADMIN_BOT_TOKEN", "").strip()
            or os.getenv("BOT_TOKEN", "").strip()
        )
    return (
        os.getenv("MAIN_BOT_TOKEN", "").strip()
        or os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        or os.getenv("BOT_TOKEN", "").strip()
    )

# Main user-facing bot token by default. Switch with TELEGRAM_BOT_PROFILE=admin.
BOT_TOKEN = resolve_bot_token()

# Channel and Group Configuration
MAIN_CHANNEL = os.getenv("MAIN_CHANNEL", "@SafeEscrowX").strip()
MAIN_CHANNEL_LINK = "https://t.me/SafeEscrowX"
TUTORIAL_CHANNEL = os.getenv("TUTORIAL_CHANNEL", "@SafeEscrowXTutorials").strip()
TUTORIAL_CHANNEL_LINK = "https://t.me/SafeEscrowXTutorials"
GROUP_CHAT_LINK = "https://t.me/SafeEscrowX_chat"
SUPPORT_BOT = "@SafeEscrowXSupport_bot"
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://safeescrowxx.netlify.app").strip()

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

    if BOT_PROFILE == "admin":
        admin_message = (
            f"🛠️ <b>SafeEscrowX Admin Bot Active</b>\n\n"
            f"Hello {user.first_name}, admin notification bot is running.\n"
            "You will receive admin-side operational alerts here."
        )
        await update.message.reply_text(
            text=admin_message,
            parse_mode=ParseMode.HTML
        )
        return
    
    # Check if user has joined required channels
    is_subscribed = await check_subscription(update, context)
    
    if not is_subscribed:
        # User hasn't joined channels - show force join message
        force_join_message = (
            "🔒 <b>Access Restricted</b>\n\n"
            "To use SafeEscrowX bot, you must join our channels first:\n\n"
            f"📢 <b>Main Channel</b>: <a href=\"{MAIN_CHANNEL_LINK}\">@SafeEscrowX</a>\n"
            f"📚 <b>Tutorial Channel</b>: <a href=\"{TUTORIAL_CHANNEL_LINK}\">@SafeEscrowXTutorials</a>\n\n"
            "After joining both channels, click the button below to verify and access the bot."
        )
        
        keyboard = [
            [InlineKeyboardButton("✅ I've Joined Both Channels", callback_data="verify_subscription")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            text=force_join_message,
            reply_markup=reply_markup,
            parse_mode=ParseMode.HTML
        )
        return
    
    # User is subscribed - show welcome message
    welcome_message = (
        f"🚀 <b>Welcome to SafeEscrowX, {user.first_name}!</b>\n\n"
        "Secure digital escrow made simple.\n\n"
        "✅ Open trade with seller\n"
        "✅ Chat before and during payment\n"
        "✅ Deposit is held until delivery approval\n"
        "✅ Dispute support when needed\n\n"
        "Use the button below to launch the Mini App."
    )
    
    # Create inline keyboard with all links
    keyboard = [
        [InlineKeyboardButton("🚀 Open Mini App", web_app=WebAppInfo(url=MINI_APP_URL))],
        [InlineKeyboardButton("💬 Join Group Chat", url=GROUP_CHAT_LINK)],
        [InlineKeyboardButton("📢 Main Channel", url=MAIN_CHANNEL_LINK),
         InlineKeyboardButton("📚 Tutorials", url=TUTORIAL_CHANNEL_LINK)],
        [InlineKeyboardButton("🛟 Support", url=f"https://t.me/SafeEscrowXSupport_bot")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        text=welcome_message,
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML
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
                text="✅ <b>Subscription Verified!</b>\n\nYou now have full access to SafeEscrowX bot. Use /start to begin!",
                parse_mode=ParseMode.HTML
            )
        else:
            await query.edit_message_text(
                text="❌ <b>Verification Failed</b>\n\nPlease make sure you've joined BOTH channels:\n\n📢 @SafeEscrowX\n📚 @SafeEscrowXTutorials\n\nThen try again.",
                parse_mode=ParseMode.HTML
            )

def main() -> None:
    """Start the bot."""
    if not BOT_TOKEN or "YOUR_BOT_TOKEN_HERE" in BOT_TOKEN:
        raise SystemExit(
            "BOT_TOKEN is missing.\n"
            "Set BOT_TOKEN in escrowx-backend/.env (or .env) and run again."
        )

    logger.info("Starting SafeEscrowX bot (profile=%s)...", BOT_PROFILE)
    logger.info("Main channel: %s | Tutorial channel: %s", MAIN_CHANNEL, TUTORIAL_CHANNEL)

    # Create the Application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Register handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Run the bot until the user presses Ctrl-C
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
