# 🚀 SafeEscrowX - Complete Deployment Guide for Beginners

**Welcome!** This guide will walk you through deploying the entire SafeEscrowX project step-by-step, even if you have zero coding experience.

**📌 IMPORTANT:** This guide works with **ANY hosting provider** - not just Render/Netlify!

---

## 📋 What You'll Deploy

1. **Telegram Bot** - Your main user interface
2. **Backend Server** - Handles all transactions and data
3. **Frontend Website** - Web interface for users

**Estimated Time:** 45-90 minutes (depends on hosting choice)  
**Cost:** FREE options available, or paid hosting of your choice

---

## 🌐 Choose Your Hosting

### Option 1: FREE Cloud Hosting (Recommended for Beginners)
- **Backend:** Render.com, Railway.app, Heroku.com, or Any Cloud Provider
- **Frontend:** Netlify.com, Vercel.com, GitHub Pages, or Any Static Host
- **Bot:** Render.com, Railway.app, or Run Locally
- **Pros:** Free, easy setup, no server management
- **Cons:** Free tiers have limitations

### Option 2: Paid Cloud Hosting (For Production)
- **Backend:** DigitalOcean, AWS, Google Cloud, Azure, Hostinger
- **Frontend:** Any web hosting, CDN, or cloud provider
- **Bot:** Same server as backend, or separate
- **Pros:** Better performance, full control, 24/7 uptime
- **Cons:** Costs money ($5-50/month)

### Option 3: Your Own Server/VPS
- **Everything:** Run on your own hardware or rented VPS
- **Pros:** Complete control, privacy
- **Cons:** Requires technical knowledge, maintenance

**This guide covers ALL options!** Choose what works for you.

---

## 🎯 Prerequisites (What You Need Before Starting)

### 1. **Create These Accounts** (15 minutes)

**Required:**
- ✅ **GitHub Account**: https://github.com/signup
- ✅ **Telegram Account**: https://telegram.org/

**Choose ONE hosting provider:**

**For FREE Hosting:**
- ✅ **Render**: https://render.com/register (Backend + Bot)
- ✅ **Netlify**: https://app.netlify.com/signup (Frontend)
- OR **Railway**: https://railway.app (Backend + Bot)
- OR **Vercel**: https://vercel.com (Frontend)

**For Paid Hosting:**
- ✅ **DigitalOcean**: https://digitalocean.com
- ✅ **Hostinger**: https://hostinger.com
- ✅ **AWS**: https://aws.amazon.com
- ✅ **Google Cloud**: https://cloud.google.com
- ✅ **Any VPS provider** of your choice

### 2. **Install These Programs** (10 minutes)

#### Git (For uploading code)
1. Go to: https://git-scm.com/download/win
2. Download and install (click "Next" on all screens)
3. Restart your computer after installation

#### Node.js (Required for the website)
1. Go to: https://nodejs.org/
2. Download the **LTS version** (Left button)
3. Install it (click "Next" on all screens)

#### Python (Required for the bot)
1. Go to: https://www.python.org/downloads/
2. Download latest Python version
3. **IMPORTANT:** During installation, check ✅ "Add Python to PATH"
4. Click "Install Now"

---

## 📱 Part 1: Create Your Telegram Bot (10 minutes)

### Step 1: Create the Bot

1. Open Telegram and search for: `@BotFather`
2. Click **START**
3. Send the command: `/newbot`
4. BotFather will ask for a **name** - Type: `SafeEscrowX`
5. BotFather will ask for a **username** - Type: `SafeEscrowX_bot` (must end with `_bot`)
6. **IMPORTANT:** BotFather will give you a **TOKEN** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
7. **Copy this token** - You'll need it later!

### Step 2: Create Your Channels

1. In Telegram, click the **pencil icon** → **New Channel**
2. Create these 3 channels/groups:

   **Channel 1: Main Channel**
   - Name: `SafeEscrowX`
   - Type: **Public**
   - Username: `SafeEscrowX`
   - Add description: "Official SafeEscrowX announcements"

   **Channel 2: Tutorial Channel**
   - Name: `SafeEscrowXTutorials`
   - Type: **Public**
   - Username: `SafeEscrowXTutorials`
   - Add description: "SafeEscrowX tutorials and guides"

   **Group 3: Community Chat**
   - Name: `SafeEscrowX Chat`
   - Type: **Public**
   - Username: `SafeEscrowX_chat`
   - Add description: "SafeEscrowX community discussions"

### Step 3: Add Bot as Admin to Channels

1. Open `@SafeEscrowX` channel
2. Click channel name → **Administrators** → **Add Admin**
3. Search for your bot: `@SafeEscrowX_bot`
4. Give it admin permissions
5. Repeat for `@SafeEscrowXTutorials` channel

---

## 🖥️ Part 2: Upload Code to GitHub (10 minutes)

### Step 1: Prepare Your Code

1. Create a new folder on your Desktop called: `SafeEscrowX`
2. Copy **ALL files** from your current project into this folder

### Step 2: Update Configuration Files

#### A. Update Telegram Bot Token

1. Open the file: `telegram_bot.py`
2. Find this line (around line 15):
   ```python
   BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"
   ```
3. Replace `YOUR_BOT_TOKEN_HERE` with your actual bot token from BotFather
4. Save the file

#### B. Update Backend Environment

1. Go to folder: `escrowx-backend`
2. Copy `.env.example` and rename it to `.env`
3. Open `.env` and update these values:
   ```
   PORT=10000
   DATABASE_URL=sqlite:///escrow.db
   JWT_SECRET=your-secret-key-change-this-to-random-text
   BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
   MAIN_CHANNEL=@SafeEscrowX
   TUTORIAL_CHANNEL=@SafeEscrowXTutorials
   ```
4. Save the file

#### C. Update Frontend Environment

1. Open the file: `.env` (in main folder)
2. Make sure it has:
   ```
   VITE_BACKEND_URL=https://your-backend-name.onrender.com
   VITE_ADMIN_PASSWORD=YourSecurePassword123!
   ```
3. **Leave the backend URL as is for now** - we'll update it after deployment
4. Save the file

### Step 3: Upload to GitHub

1. Go to https://github.com/new
2. Repository name: `SafeEscrowX`
3. Make it **Public**
4. Click **Create repository**
5. Open **Command Prompt** (Search in Windows menu)
6. Type these commands one by one (press Enter after each):

```bash
cd Desktop\SafeEscrowX
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/SafeEscrowX.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username!

---

## 🌐 Part 3: Deploy Backend Server (15-30 minutes)

**Choose your hosting method below:**

---

### Option A: Deploy to Render.com (FREE)

1. Go to https://render.com and login
2. Click **New +** → **Web Service**
3. Connect your GitHub account
4. Select your `SafeEscrowX` repository
5. Configure these settings:

   ```
   Name: escrowx-backend
   Region: Virginia (or closest to you)
   Branch: main
   Root Directory: escrowx-backend
   Runtime: Node
   Build Command: npm install
   Start Command: node server.js
   Instance Type: Free
   ```

6. Click **Advanced** and add these **Environment Variables**:

   ```
   PORT = 10000
   DATABASE_URL = sqlite:///escrow.db
   JWT_SECRET = my-super-secret-key-12345
   BOT_TOKEN = YOUR_BOT_TOKEN_HERE
   MAIN_CHANNEL = @SafeEscrowX
   TUTORIAL_CHANNEL = @SafeEscrowXTutorials
   NODE_ENV = production
   ```

7. Click **Create Web Service**
8. Wait 5-10 minutes for deployment
9. Once deployed, you'll see a URL like: `https://escrowx-backend-xyz.onrender.com`
10. **Copy this URL** - You need it for the next steps!

---

### Option B: Deploy to Railway.app (FREE)

1. Go to https://railway.app and login with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `SafeEscrowX` repository
4. Railway will auto-detect it's a Node.js app
5. Click **Variables** tab and add:

   ```
   PORT = 10000
   DATABASE_URL = sqlite:///escrow.db
   JWT_SECRET = my-super-secret-key-12345
   BOT_TOKEN = YOUR_BOT_TOKEN_HERE
   MAIN_CHANNEL = @SafeEscrowX
   TUTORIAL_CHANNEL = @SafeEscrowXTutorials
   NODE_ENV = production
   ```

6. Click **Deploy**
7. Wait 5-10 minutes
8. Copy your Railway URL (looks like: `https://your-app.railway.app`)

---

### Option C: Deploy to Heroku (FREE with limitations)

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Open Command Prompt and login:
   ```bash
   heroku login
   ```
3. Create app:
   ```bash
   cd Desktop\SafeEscrowX\escrowx-backend
   heroku create your-app-name
   ```
4. Set environment variables:
   ```bash
   heroku config:set PORT=10000
   heroku config:set DATABASE_URL=sqlite:///escrow.db
   heroku config:set JWT_SECRET=my-super-secret-key-12345
   heroku config:set BOT_TOKEN=YOUR_BOT_TOKEN
   heroku config:set MAIN_CHANNEL=@SafeEscrowX
   heroku config:set TUTORIAL_CHANNEL=@SafeEscrowXTutorials
   heroku config:set NODE_ENV=production
   ```
5. Deploy:
   ```bash
   git push heroku main
   ```
6. Copy your Heroku URL: `https://your-app-name.herokuapp.com`

---

### Option D: Deploy to Your Own VPS/Server (DigitalOcean, AWS, etc.)

**Step 1: Connect to your server**
```bash
# Windows users: Use PuTTY or SSH
ssh root@YOUR_SERVER_IP
```

**Step 2: Install Node.js**
```bash
# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Check installation:
node --version
npm --version
```

**Step 3: Upload your code**
```bash
# From your computer (new terminal):
scp -r Desktop\SafeEscrowX\escrowx-backend root@YOUR_SERVER_IP:/root/escrowx-backend
```

**Step 4: Install dependencies and start**
```bash
# On your server:
cd /root/escrowx-backend
npm install

# Create .env file:
nano .env
```

Add this to .env:
```
PORT=10000
DATABASE_URL=sqlite:///escrow.db
JWT_SECRET=my-super-secret-key-12345
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
MAIN_CHANNEL=@SafeEscrowX
TUTORIAL_CHANNEL=@SafeEscrowXTutorials
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter)

**Step 5: Install PM2 (keeps app running)**
```bash
npm install -g pm2
pm2 start server.js --name escrowx-backend
pm2 save
pm2 startup
```

**Step 6: Open firewall port**
```bash
ufw allow 10000
```

**Your backend URL:** `http://YOUR_SERVER_IP:10000`

---

### Step 2: Test Your Backend

1. Open your browser
2. Go to: `YOUR_BACKEND_URL/api/health`
3. You should see: `{"status": "ok"}`

**Examples:**
- Render: `https://escrowx-backend-xyz.onrender.com/api/health`
- Railway: `https://your-app.railway.app/api/health`
- VPS: `http://123.45.67.89:10000/api/health`

✅ **If you see the OK message, your backend is working!**

---

### Step 3: Update Frontend with Backend URL

1. Open the file: `.env` (in main SafeEscrowX folder)
2. Update this line with your backend URL:
   ```
   VITE_BACKEND_URL=YOUR_BACKEND_URL_HERE
   ```
   (Replace with your actual backend URL from any hosting provider)
3. Save the file
4. Commit and push to GitHub:

```bash
git add .env
git commit -m "Update backend URL"
git push
```

---

## 🎨 Part 4: Deploy Frontend Website (15-30 minutes)

**Choose your hosting method below:**

---

### Option A: Deploy to Netlify (FREE)

1. Go to https://app.netlify.com and login
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** and connect your repository
4. Select `SafeEscrowX` repository
5. Configure build settings:

   ```
   Branch to deploy: main
   Build command: npm run build
   Publish directory: dist
   ```

6. Click **Environment variables** and add:

   ```
   VITE_BACKEND_URL = YOUR_BACKEND_URL_HERE
   VITE_ADMIN_PASSWORD = YourSecurePassword123!
   ```

   (Use your actual backend URL)

7. Click **Deploy site**
8. Wait 3-5 minutes for deployment
9. Your site will be live at: `https://your-site-name.netlify.app`

---

### Option B: Deploy to Vercel (FREE)

1. Go to https://vercel.com and login with GitHub
2. Click **Add New...** → **Project**
3. Import your `SafeEscrowX` repository
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Environment Variables** and add:

   ```
   VITE_BACKEND_URL = YOUR_BACKEND_URL_HERE
   VITE_ADMIN_PASSWORD = YourSecurePassword123!
   ```

6. Click **Deploy**
7. Wait 3-5 minutes
8. Your site URL: `https://your-project.vercel.app`

---

### Option C: Deploy to GitHub Pages (FREE)

1. Install gh-pages package:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Open `vite.config.ts` and add this line before the last `}`:
   ```typescript
   base: '/SafeEscrowX/',
   ```

3. Open `package.json` and add these scripts:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

4. Deploy:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   npm run deploy
   ```

5. Go to your GitHub repository → **Settings** → **Pages**
6. Source: Select **gh-pages** branch
7. Your site: `https://YOUR_USERNAME.github.io/SafeEscrowX/`

---

### Option D: Deploy to Your Own Server/VPS

**Step 1: Build the frontend**
```bash
# On your computer:
cd Desktop\SafeEscrowX
npm run build
```

**Step 2: Upload to server**
```bash
# Upload the 'dist' folder to your server:
scp -r dist root@YOUR_SERVER_IP:/var/www/escrowx-frontend
```

**Step 3: Install Nginx**
```bash
# On your server:
sudo apt update
sudo apt install nginx
```

**Step 4: Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/escrowx
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    root /var/www/escrowx-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Save and exit (Ctrl+X, Y, Enter)

**Step 5: Enable the site**
```bash
sudo ln -s /etc/nginx/sites-available/escrowx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Your frontend URL:** `http://YOUR_SERVER_IP` or `http://YOUR_DOMAIN`

---

### Step 2: Test Your Frontend

1. Open your browser
2. Go to your frontend URL
3. Website should load
4. Open browser console (F12) - no errors should appear

✅ **If website loads correctly, your frontend is working!**

---

### Step 3: (Optional) Custom Domain

1. In Netlify, go to **Domain settings**
2. Click **Add custom domain**
3. Follow the instructions to add your domain

---

## 🤖 Part 5: Start the Telegram Bot (5 minutes)

### Option A: Run on Your Computer (Testing)

1. Open Command Prompt
2. Navigate to your project folder:

```bash
cd Desktop\SafeEscrowX
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. Start the bot:

```bash
python telegram_bot.py
```

5. You should see: "Bot is running..."
6. **Keep this window open** - The bot runs as long as this window is open

**⚠️ Limitation:** Bot stops when you close the window!

### Option B: Run 24/7 on Render (Recommended)

1. In your Render dashboard, click **New +** → **Web Service**
2. Connect your `SafeEscrowX` repository
3. Configure:

   ```
   Name: escrowx-bot
   Root Directory: escrowx-backend (or wherever bot is)
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python telegram_bot.py
   Instance Type: Free
   ```

4. Add environment variables:

   ```
   BOT_TOKEN = YOUR_BOT_TOKEN_HERE
   MAIN_CHANNEL = @SafeEscrowX
   TUTORIAL_CHANNEL = @SafeEscrowXTutorials
   ```

5. Click **Create Web Service**
6. Bot will run 24/7 automatically!

---

## ✅ Part 6: Test Everything (5 minutes)

### Test 1: Telegram Bot

1. Open Telegram and search for your bot: `@SafeEscrowX_bot`
2. Click **START**
3. You should see the welcome message with buttons
4. If it asks you to join channels, join them and click verify
5. Test all buttons to make sure links work

### Test 2: Backend API

1. Open your browser
2. Go to: `https://your-backend-url.onrender.com/api/health`
3. You should see: `{"status": "ok"}`

### Test 3: Frontend Website

1. Open your Netlify URL: `https://your-site.netlify.app`
2. The website should load
3. Try creating an account (if using Telegram WebApp)
4. Test the main features

---

## 🔧 Troubleshooting Guide

### Problem: Bot doesn't respond

**Solution:**
1. Check if `telegram_bot.py` is still running
2. Verify BOT_TOKEN is correct
3. Make sure bot is admin in both channels
4. Check command prompt for error messages

### Problem: Website shows "Cannot connect to backend"

**Solution:**
1. Verify backend is deployed on Render (check dashboard)
2. Make sure `.env` file has correct `VITE_BACKEND_URL`
3. Wait 5 minutes - Render servers might be starting up

### Problem: Force join not working

**Solution:**
1. Make sure bot is **ADMIN** in both channels
2. Bot needs "View Channel Members" permission
3. Try removing bot from channels and re-adding as admin

### Problem: Can't push to GitHub

**Solution:**
```bash
# If you get authentication errors:
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# Then try pushing again:
git push
```

### Problem: Python command not found

**Solution:**
1. Reinstall Python from https://www.python.org/downloads/
2. **IMPORTANT:** Check ✅ "Add Python to PATH" during installation
3. Restart your computer
4. Try again

---

## 📊 Your Deployment Checklist

- [ ] Created Telegram Bot with BotFather
- [ ] Created 3 channels/groups
- [ ] Added bot as admin to channels
- [ ] Updated `telegram_bot.py` with bot token
- [ ] Updated backend `.env` file
- [ ] Updated frontend `.env` file
- [ ] Uploaded code to GitHub
- [ ] Deployed backend on your chosen hosting
- [ ] Deployed frontend on your chosen hosting
- [ ] Started Telegram bot
- [ ] Tested all 3 components
- [ ] Everything works! 🎉

---

## 🎓 Next Steps

### Update Admin Password
1. Go to your Netlify site
2. Login with: `admin@escrowx.com`
3. Use the password from your `.env` file
4. Change it to something secure

### Customize Your Bot
- Edit `telegram_bot.py` to change welcome message
- Update images by changing the `image_url` variable
- Add more features as needed

### Monitor Your Services
- **Render Dashboard:** https://dashboard.render.com
- **Netlify Dashboard:** https://app.netlify.com
- Check logs if something breaks

### Get a Custom Domain (Optional)
1. Buy a domain from Namecheap (~$10/year)
2. Connect it in Netlify settings
3. Update backend URL in frontend `.env`

---

## 🆘 Need Help?

If you get stuck:

1. **Check the logs** in your hosting dashboard
2. **Read error messages** carefully - they usually tell you what's wrong
3. **Google the error** - Someone has probably solved it before
4. **Contact Support:**
   - 📱 **WhatsApp:** +8801788378436 (Fastest Response!)
   - 💬 **Telegram:** @SafeEscrowXSupport_bot
   - 📧 **Email:** admin@escrowx.com

---

## 📞 Quick Reference

### Your Important URLs
- **Bot Token:** From @BotFather
- **Backend URL:** YOUR_BACKEND_URL (from your hosting provider)
- **Frontend URL:** YOUR_FRONTEND_URL (from your hosting provider)
- **Admin Login:** admin@escrowx.com

### Your Important Files
- `telegram_bot.py` - Telegram bot code
- `.env` - Frontend configuration
- `escrowx-backend/.env` - Backend configuration
- `config/api.ts` - API endpoints

### Commands You'll Use
```bash
# Navigate to project
cd Desktop\SafeEscrowX

# Update and push to GitHub
git add .
git commit -m "Made changes"
git push

# Start bot locally
python telegram_bot.py

# Install Python packages
pip install -r requirements.txt

# Install Node packages
npm install
```

---

## 🎉 Congratulations!

You've successfully deployed SafeEscrowX! 

Your project is now:
- ✅ Live on the internet
- ✅ Accessible via Telegram
- ✅ Running 24/7 on free servers
- ✅ Ready for users!

**Share your bot:** `https://t.me/YourBotUsername`  
**Share your website:** `https://your-site.netlify.app`

---

**Last Updated:** April 30, 2026  
**Guide Version:** 1.0  
**Estimated Total Time:** 45-60 minutes
