# 🚀 Quick Start Checklist - SafeEscrowX Deployment

**Print this page and check off each step as you complete it!**

---

## 📦 BEFORE YOU START

- [ ] Created GitHub account (https://github.com/signup)
- [ ] Created Render account (https://render.com)
- [ ] Created Netlify account (https://netlify.com)
- [ ] Installed Git (https://git-scm.com)
- [ ] Installed Node.js LTS (https://nodejs.org)
- [ ] Installed Python (https://python.org) - ✅ Checked "Add to PATH"
- [ ] Restarted computer after installations

---

## 📱 PART 1: TELEGRAM SETUP (15 min)

### Create Bot
- [ ] Opened @BotFather in Telegram
- [ ] Sent `/newbot` command
- [ ] Named bot: `SafeEscrowX`
- [ ] Username: `SafeEscrowX_bot`
- [ ] **Copied BOT TOKEN** (Write it here): _______________________________

### Create Channels
- [ ] Created main channel: `@SafeEscrowX` (Public)
- [ ] Created tutorial channel: `@SafeEscrowXTutorials` (Public)
- [ ] Created group chat: `@SafeEscrowX_chat` (Public)

### Set Permissions
- [ ] Made bot ADMIN in `@SafeEscrowX`
- [ ] Made bot ADMIN in `@SafeEscrowXTutorials`
- [ ] Bot has "View Members" permission in both channels

---

## 💻 PART 2: PREPARE CODE (15 min)

### Update Configuration Files
- [ ] Opened `telegram_bot.py`
- [ ] Replaced `YOUR_BOT_TOKEN_HERE` with actual token
- [ ] Saved file

- [ ] Opened `escrowx-backend/.env`
- [ ] Set `BOT_TOKEN=your_actual_token`
- [ ] Set `JWT_SECRET=random-secret-text`
- [ ] Saved file

- [ ] Opened `.env` (main folder)
- [ ] Verified `VITE_BACKEND_URL` is present
- [ ] Set `VITE_ADMIN_PASSWORD=YourPassword123!`
- [ ] Saved file

### Upload to GitHub
- [ ] Created folder `Desktop\SafeEscrowX`
- [ ] Copied all project files there
- [ ] Opened Command Prompt
- [ ] Ran: `cd Desktop\SafeEscrowX`
- [ ] Ran: `git init`
- [ ] Ran: `git add .`
- [ ] Ran: `git commit -m "Initial commit"`
- [ ] Created GitHub repository at https://github.com/new
- [ ] Repository name: `SafeEscrowX`
- [ ] Made it Public
- [ ] Ran: `git remote add origin https://github.com/YOUR_USERNAME/SafeEscrowX.git`
- [ ] Ran: `git push -u origin main`
- [ ] **Verified code appears on GitHub.com** ✅

---

## 🌐 PART 3: DEPLOY BACKEND (10 min)

### Deploy on Render
- [ ] Logged into https://render.com
- [ ] Clicked **New +** → **Web Service**
- [ ] Connected GitHub account
- [ ] Selected `SafeEscrowX` repository

**Configuration:**
- [ ] Name: `escrowx-backend`
- [ ] Region: Virginia (or closest)
- [ ] Branch: `main`
- [ ] Root Directory: `escrowx-backend`
- [ ] Runtime: `Node`
- [ ] Build Command: `npm install`
- [ ] Start Command: `node server.js`
- [ ] Instance Type: `Free`

**Environment Variables:**
- [ ] Added `PORT = 10000`
- [ ] Added `DATABASE_URL = sqlite:///escrow.db`
- [ ] Added `JWT_SECRET = my-secret-key-12345`
- [ ] Added `BOT_TOKEN = your_token_here`
- [ ] Added `MAIN_CHANNEL = @SafeEscrowX`
- [ ] Added `TUTORIAL_CHANNEL = @SafeEscrowXTutorials`
- [ ] Added `NODE_ENV = production`

- [ ] Clicked **Create Web Service**
- [ ] Waited for deployment (5-10 min)
- [ ] **Copied backend URL** (Write it here): _______________________________
- [ ] Tested: `https://your-backend-url.onrender.com/api/health`
- [ ] Saw: `{"status": "ok"}` ✅

---

## 🎨 PART 4: DEPLOY FRONTEND (10 min)

### Update Frontend Config
- [ ] Opened `.env` file again
- [ ] Updated: `VITE_BACKEND_URL=https://your-backend-url.onrender.com`
- [ ] Saved file
- [ ] Ran: `git add .`
- [ ] Ran: `git commit -m "Update backend URL"`
- [ ] Ran: `git push`

### Deploy on Netlify
- [ ] Logged into https://app.netlify.com
- [ ] Clicked **Add new site** → **Import existing project**
- [ ] Chose GitHub
- [ ] Selected `SafeEscrowX` repository

**Build Settings:**
- [ ] Branch: `main`
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`

**Environment Variables:**
- [ ] Added `VITE_BACKEND_URL = your_render_url_here`
- [ ] Added `VITE_ADMIN_PASSWORD = YourPassword123!`

- [ ] Clicked **Deploy site**
- [ ] Waited for deployment (3-5 min)
- [ ] **Copied frontend URL** (Write it here): _______________________________
- [ ] Opened URL in browser
- [ ] Website loads correctly ✅

---

## 🤖 PART 5: START BOT (5 min)

### Option A: Run Locally (Testing)
- [ ] Opened Command Prompt
- [ ] Ran: `cd Desktop\SafeEscrowX`
- [ ] Ran: `pip install -r requirements.txt`
- [ ] Ran: `python telegram_bot.py`
- [ ] Saw: "Bot is running..."
- [ ] **Kept window open** ✅

### Option B: Deploy Bot on Render (24/7)
- [ ] Created new Web Service on Render
- [ ] Name: `escrowx-bot`
- [ ] Root Directory: (wherever bot is located)
- [ ] Runtime: `Python 3`
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `python telegram_bot.py`
- [ ] Added `BOT_TOKEN` environment variable
- [ ] Deployed successfully
- [ ] Bot running 24/7 ✅

---

## ✅ PART 6: TEST EVERYTHING (5 min)

### Test Telegram Bot
- [ ] Opened Telegram
- [ ] Searched: `@SafeEscrowX_bot`
- [ ] Clicked START
- [ ] Saw welcome message
- [ ] Joined both channels (if required)
- [ ] Clicked verify button
- [ ] Got access to bot ✅
- [ ] Tested all buttons
- [ ] All links work ✅

### Test Backend
- [ ] Opened: `https://your-backend.onrender.com/api/health`
- [ ] Saw: `{"status": "ok"}` ✅

### Test Frontend
- [ ] Opened: `https://your-site.netlify.app`
- [ ] Website loads ✅
- [ ] Can navigate around ✅

---

## 🎉 DEPLOYMENT COMPLETE!

### Save Your Information
**Bot Token:** ___________________________________  
**Backend URL:** ___________________________________  
**Frontend URL:** ___________________________________  
**Admin Email:** admin@escrowx.com  
**Admin Password:** ___________________________________  

### Your Live Links
**Bot:** https://t.me/SafeEscrowX_bot  
**Website:** (Your Netlify URL)  
**Main Channel:** https://t.me/SafeEscrowX  
**Tutorial Channel:** https://t.me/SafeEscrowXTutorials  
**Group Chat:** https://t.me/SafeEscrowX_chat  

---

## 📝 MAINTENANCE CHECKLIST (Weekly)

- [ ] Check Render dashboard for backend status
- [ ] Check Netlify dashboard for frontend status
- [ ] Test bot is responding
- [ ] Check error logs if needed
- [ ] Update code and push to GitHub if making changes

---

## 🆘 TROUBLESHOOTING

**Bot not responding?**
- Check if bot is running
- Verify BOT_TOKEN is correct
- Check bot is admin in channels

**Website not loading?**
- Check Netlify deployment status
- Verify backend URL in .env is correct
- Wait 5 minutes (servers might be starting)

**Backend errors?**
- Check Render logs
- Verify all environment variables are set
- Check database connection

**Can't push to GitHub?**
- Run: `git config --global user.email "your@email.com"`
- Run: `git config --global user.name "Your Name"`
- Try pushing again

---

## 💡 PRO TIPS

1. **Bookmark these dashboards:**
   - Render: https://dashboard.render.com
   - Netlify: https://app.netlify.com
   - GitHub: https://github.com

2. **Save your credentials** in a password manager

3. **Never commit `.env` files** to GitHub (they contain secrets)

4. **Test changes locally** before pushing to production

5. **Monitor your free tier limits:**
   - Render: 750 hours/month free
   - Netlify: 100GB bandwidth/month free

---

**Started at:** ___________  
**Finished at:** ___________  
**Total time:** ___________  

**Status:** 🎉 SUCCESSFULLY DEPLOYED!

---

*For detailed instructions, see DEPLOYMENT_GUIDE.md*
