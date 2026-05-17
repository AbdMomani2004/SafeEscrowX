# 🔧 Troubleshooting Guide - SafeEscrowX

**Common problems and their solutions - Updated April 2026**

---

## 🚨 CRITICAL ISSUES

### 1. Bot Doesn't Respond at All

**Symptoms:**
- You send `/start` but get no response
- Bot shows "online" but doesn't reply

**Solutions:**

**A. Check if bot is running:**
```bash
# If running locally, you should see this in Command Prompt:
"Bot is running..."
```

**B. Verify BOT_TOKEN:**
1. Open `telegram_bot.py`
2. Check line 15: `BOT_TOKEN = "your_token"`
3. Make sure it matches what @BotFather gave you
4. Token format: `123456789:ABCdef...` (long string with colon)

**C. Restart the bot:**
```bash
# Stop current bot (Ctrl+C)
# Then start again:
python telegram_bot.py
```

**D. Check bot isn't banned:**
- Message @BotFather
- Send `/mybots`
- Select your bot
- Make sure it's not disabled

---

### 2. Force Join Not Working

**Symptoms:**
- User joins channels but verification fails
- Bot says "Verification Failed" even after joining

**Solutions:**

**A. Bot MUST be admin in channels:**
1. Open `@SafeEscrowX` channel
2. Click channel name → Administrators
3. Add administrator: `@SafeEscrowX_bot`
4. Give these permissions:
   - ✅ View Channel Members
   - ✅ Post Messages (optional)
5. Repeat for `@SafeEscrowXTutorials`

**B. Channels must be PUBLIC:**
1. Go to Channel Settings
2. Channel Type: **Public** (not Private)
3. Must have a username (link)

**C. Wait 30 seconds after joining:**
- Sometimes Telegram takes time to update member list
- Join channel → Wait 30 seconds → Click verify

**D. Test manually:**
```python
# Add this to telegram_bot.py temporarily to debug:
print(f"User {user_id} status: {member_main.status}")
```

---

### 3. Website Shows "Cannot Connect to Backend"

**Symptoms:**
- Frontend loads but can't make API calls
- Console shows: "Failed to fetch" errors

**Solutions:**

**A. Check backend is running:**
1. Go to https://dashboard.render.com
2. Find your backend service
3. Status should be: **Live** (green)
4. If it says "Starting" - wait 5 minutes

**B. Verify backend URL:**
1. Open `.env` file (main folder)
2. Check this line:
   ```
   VITE_BACKEND_URL=https://escrowx-backend-xyz.onrender.com
   ```
3. Must match your Render URL exactly
4. No trailing slash at the end!

**C. Test backend directly:**
```
Open browser: https://your-backend.onrender.com/api/health
Should see: {"status": "ok"}
```

**D. Rebuild frontend:**
```bash
npm run build
git add .
git commit -m "Rebuild"
git push
```

---

## ⚙️ DEPLOYMENT ERRORS

### 4. Git Push Fails

**Error:** `Authentication failed`

**Solution:**
```bash
# Set your Git credentials
git config --global user.email "your-github-email@example.com"
git config --global user.name "Your GitHub Username"

# Try pushing again
git push
```

**Error:** `Remote origin already exists`

**Solution:**
```bash
# Remove old remote
git remote remove origin

# Add correct one
git remote add origin https://github.com/YOUR_USERNAME/SafeEscrowX.git

# Push
git push -u origin main
```

---

### 5. Render Deployment Fails

**Error:** `Build failed`

**Solution:**
1. Click on deployment in Render dashboard
2. Click **Logs** tab
3. Scroll to find error message
4. Common fixes:

**A. Missing dependencies:**
```
# Check package.json exists in escrowx-backend folder
# Make sure all dependencies are listed
```

**B. Wrong root directory:**
- In Render settings, verify:
  - Root Directory: `escrowx-backend`
  - (Not the main project folder)

**C. Wrong start command:**
- Should be: `node server.js`
- Not: `npm start` (unless configured)

**D. Environment variables missing:**
- Check all required vars are set
- Especially: `PORT`, `DATABASE_URL`, `JWT_SECRET`

---

### 6. Netlify Deployment Fails

**Error:** `Build command returned non-zero exit code`

**Solution:**

**A. Check build logs:**
1. Go to Netlify dashboard
2. Click on failed deployment
3. Read error messages

**B. Common fixes:**

**Missing dependencies:**
```bash
# Make sure package.json has all dependencies
npm install
```

**Wrong publish directory:**
- Should be: `dist`
- Not: `build` or `public`

**Environment variables not set:**
```
VITE_BACKEND_URL = https://your-backend.onrender.com
VITE_ADMIN_PASSWORD = YourPassword123!
```

**C. Try manual build:**
```bash
npm run build
# Check if dist folder is created
# If yes, deployment should work
```

---

## 🐍 PYTHON ERRORS

### 7. Python Command Not Found

**Error:** `'python' is not recognized`

**Solution:**

**A. Reinstall Python:**
1. Download from https://python.org/downloads
2. **IMPORTANT:** Check ✅ "Add Python to PATH"
3. Complete installation
4. **Restart computer**
5. Try again

**B. Use alternative command:**
```bash
# Try these instead:
python3 telegram_bot.py
py telegram_bot.py
```

**C. Add to PATH manually:**
1. Find Python installation folder (usually `C:\Users\YourName\AppData\Local\Programs\Python\Python3xx`)
2. Add to Windows PATH environment variable
3. Restart Command Prompt

---

### 8. Module Not Found Error

**Error:** `ModuleNotFoundError: No module named 'telegram'`

**Solution:**
```bash
# Install required packages
pip install -r requirements.txt

# Or install manually
pip install python-telegram-bot==20.7
```

**If pip not found:**
```bash
python -m pip install python-telegram-bot==20.7
```

---

## 🌐 NETWORK ERRORS

### 9. CORS Errors in Browser Console

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**

**A. Backend needs CORS enabled:**
1. Open `escrowx-backend/server.js`
2. Find CORS configuration
3. Should look like:
```javascript
app.use(cors({
  origin: ['https://your-site.netlify.app', 'http://localhost:3000']
}));
```
4. Add your Netlify URL to the list

**B. Rebuild and redeploy:**
```bash
git add .
git commit -m "Fix CORS"
git push
```

---

### 10. SSL/TLS Certificate Errors

**Error:** `certificate has expired` or `self-signed certificate`

**Solution:**

**A. Update Node.js:**
- Download latest LTS from https://nodejs.org
- Install and restart

**B. Check system date:**
- Make sure your computer's date/time is correct
- Wrong date causes SSL errors

---

## 📱 TELEGRAM-SPECIFIC ISSUES

### 11. Bot Can't Check Channel Membership

**Error:** `Chat not found` or `User not found`

**Solution:**

**A. Bot must be admin:**
- Add bot as admin to both channels
- Give "View Members" permission

**B. Channel usernames must be correct:**
```python
# In telegram_bot.py, verify:
MAIN_CHANNEL = "@SafeEscrowX"  # Must have @ symbol
TUTORIAL_CHANNEL = "@SafeEscrowXTutorials"
```

**C. Channels must exist:**
- Try visiting: https://t.me/SafeEscrowX
- If page not found, channel doesn't exist or is private

---

### 12. Bot Kicked from Channel

**Symptoms:**
- Force join was working, now broken
- Error: "Bot is not a member of channel"

**Solution:**
1. Re-add bot as admin to channel
2. Check channel settings
3. Verify bot username hasn't changed

---

## 💾 DATABASE ERRORS

### 13. Database Connection Failed

**Error:** `Cannot connect to database`

**Solution:**

**A. Check DATABASE_URL in .env:**
```
# For SQLite (simplest):
DATABASE_URL=sqlite:///escrow.db

# For PostgreSQL (production):
DATABASE_URL=postgresql://user:password@host:port/dbname
```

**B. File permissions (SQLite):**
```bash
# Make sure database file is writable
# On Windows: Right-click file → Properties → uncheck "Read-only"
```

**C. PostgreSQL not connecting:**
- Check credentials are correct
- Verify database server is running
- Check firewall settings

---

## 🔐 SECURITY ISSUES

### 14. Bot Token Exposed in GitHub

**CRITICAL:** If you accidentally committed your bot token:

**IMMEDIATE ACTIONS:**
1. Go to @BotFather in Telegram
2. Send `/mybots`
3. Select your bot
4. Click **API Token** → **Revoke current token**
5. Get new token
6. Update `.env` file
7. **Never commit `.env` files!**

**Prevent future exposure:**
```bash
# Create .gitignore file
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Ignore env files"
```

---

## 📊 PERFORMANCE ISSUES

### 15. Render Service Sleeping

**Problem:**
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes 30-50 seconds

**Solutions:**

**A. Use keep-alive service:**
- Sign up for https://cron-job.org (free)
- Create job to ping your backend every 5 minutes
- URL: `https://your-backend.onrender.com/api/health`

**B. Upgrade to paid plan:**
- Render paid plans don't sleep
- Starts at $7/month

**C. Accept the delay:**
- Free tier is fine for testing
- Users just wait ~30 seconds first time

---

### 16. Slow Website Loading

**Solutions:**

**A. Enable Netlify caching:**
- Already enabled by default
- Check in Site settings → Build & deploy

**B. Optimize images:**
- Compress images before uploading
- Use WebP format

**C. Check backend response time:**
```bash
# Test backend speed
curl -w "@curl-format.txt" -o /dev/null -s "https://your-backend.onrender.com/api/health"
```

---

## 🛠️ DEBUGGING TIPS

### How to Read Error Logs

**Render Logs:**
1. Dashboard → Your service → Logs
2. Look for lines starting with `ERROR`
3. Read the full error message
4. Google the error + "Render"

**Netlify Logs:**
1. Dashboard → Your site → Deploys
2. Click failed deployment
3. Click "Show build log"
4. Find first error message

**Python Bot Logs:**
- Errors show in Command Prompt where bot is running
- Look for tracebacks (lines with `Error:` or `Exception:`)

### How to Ask for Help

When asking for help, include:
1. **What you were trying to do**
2. **Full error message** (screenshot or copy)
3. **What you've already tried**
4. **Your OS** (Windows/Mac/Linux)
5. **Links to your services** (if deployed)

---

## 📞 EMERGENCY CONTACTS

**Stuck and need help?**

1. **Check documentation:**
   - DEPLOYMENT_GUIDE.md
   - QUICK_START_CHECKLIST.md

2. **Search online:**
   - Google the exact error message
   - Check Stack Overflow

3. **Contact support:**
   - Telegram: @SafeEscrowXSupport_bot
   - Email: admin@escrowx.com

4. **Check service status:**
   - Render: https://status.render.com
   - Netlify: https://www.netlifystatus.com
   - Telegram: https://downdetector.com/status/telegram/

---

## ✅ VERIFICATION CHECKLIST

After fixing any issue, verify:

- [ ] Bot responds to `/start`
- [ ] Force join works correctly
- [ ] All buttons and links work
- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] Can create trades/transactions
- [ ] No console errors in browser
- [ ] All environment variables set

---

**Last Updated:** April 30, 2026  
**Version:** 1.0  
**Maintained by:** SafeEscrowX Team

*Still having issues? Contact @SafeEscrowXSupport_bot on Telegram*
