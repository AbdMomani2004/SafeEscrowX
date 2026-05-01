from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo
)
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes
)

# === BOT CONFIG ===
BOT_TOKEN = "8336733967:AAFf8uW2TTv7mFmzlCca_QPlwui3GvUUbCk"  # Replace with your actual token
WEBAPP_URL = "https://escrowxza.netlify.app/"
COMMUNITY_URL = "https://t.me/SafeEscrowX"

# === START COMMAND ===
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    welcome_text = (
        "🚀 <b>Welcome to SafeEscrowX — The Next Generation Escrow System!</b>\n\n"
        "💎 <b>Why Choose Us:</b>\n\n"
        "1️⃣ <b>Safe & Easy Transactions</b>\n"
        "Enjoy secure, seamless trading through our fully automated escrow process.\n\n"
        "2️⃣ <b>No Admins Needed</b>\n"
        "Transactions run automatically — admins only step in during disputes.\n\n"
        "3️⃣ <b>0% Scam Rate</b>\n"
        "Our bot runs as a Mini App, meaning scammers can’t clone usernames or fake bots.\n\n"
        "4️⃣ <b>Built-in Marketplace</b>\n"
        "Sellers list their items directly, buyers browse safely and easily.\n\n"
        "5️⃣ <b>Low 1% Fee</b>\n"
        "Only 1% per transaction — one of the lowest rates available.\n\n"
        "6️⃣ <b>Trusted Rating System</b>\n"
        "Earn and display verified trust scores as a buyer or seller.\n\n"
        "7️⃣ <b>Fully Automated Smart Contracts</b>\n"
        "Payments are held securely until both sides confirm satisfaction.\n\n"
        "8️⃣ <b>Advanced Dispute Resolution</b>\n"
        "If issues arise, our team ensures fair resolutions — scammers are permanently banned.\n\n"
        "✨ <b>Start trading safely and smartly today with SafeEscrowX!</b>"
    )

    keyboard = [
        [
            InlineKeyboardButton(
                "🚀 Launch Mini App", web_app=WebAppInfo(url=WEBAPP_URL)
            )
        ],
        [
            InlineKeyboardButton(
                "🌐 Join Community", url=COMMUNITY_URL
            )
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        welcome_text,
        reply_markup=reply_markup,
        parse_mode="HTML",
        disable_web_page_preview=True
    )

# === MAIN APP ===
def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    print("🤖 SafeEscrowX Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
