# 🚀 Frontend Deployment to Vercel - Complete Guide

## ✅ Backend is Live!
Your backend is running at: **https://mockmarket-backend.onrender.com**

Now let's deploy the frontend to Vercel!

---

## 📋 Step-by-Step: Deploy Frontend to Vercel

### Step 1: Push Backend CORS Update

First, commit the CORS changes I just made:

```powershell
cd c:\Users\reddy\Desktop\mock_market\MockMarket
git add backend/app.py
git commit -m "Update CORS for Vercel deployment"
git push origin main
```

**Why:** Backend needs to allow requests from Vercel's domain.

---

### Step 2: Deploy to Vercel

#### A. Sign Up / Log In to Vercel

1. Go to: **https://vercel.com/signup**
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account

#### B. Import Your Project

1. After login, click **"Add New..."** → **"Project"**
2. Find **"MockMarket"** repository in the list
3. Click **"Import"**

#### C. Configure Project Settings

**Framework Preset:** Next.js (auto-detected) ✅

**Root Directory:**
```
frontend
```
⚠️ **IMPORTANT:** Set this to `frontend` (same as Render!)

**Build Settings:** (Auto-detected, verify these)
```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

#### D. Add Environment Variables

Click **"Environment Variables"** section and add:

```bash
# Backend API URL (your Render backend)
NEXT_PUBLIC_API_URL
https://mockmarket-backend.onrender.com

NEXT_PUBLIC_BACKEND_BASE_URL
https://mockmarket-backend.onrender.com

# Site URL (Vercel will show this after deploy, use placeholder for now)
NEXT_PUBLIC_SITE_URL
https://mockmarket-frontend.vercel.app

# Google OAuth Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID
your-google-client-id.apps.googleusercontent.com
```

**How to add each:**
1. Click "+ Add"
2. Name: `NEXT_PUBLIC_API_URL`
3. Value: `https://mockmarket-backend.onrender.com`
4. Click "Add" (leave all environments checked)
5. Repeat for each variable

#### E. Deploy!

Click **"Deploy"** button

Vercel will:
- Install dependencies (2-3 minutes)
- Build your Next.js app (2-3 minutes)
- Deploy to CDN (instant)

**Total time:** ~5-7 minutes

---

### Step 3: Update Environment Variables After Deploy

Once deployed, Vercel gives you a URL like:
```
https://mock-market-abc123.vercel.app
```

**Go back and update:**

1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_SITE_URL`:
   - Change from placeholder to your actual Vercel URL
3. **Redeploy:** Deployments → Latest → ⋯ Menu → "Redeploy"

---

### Step 4: Update Google OAuth Redirect URIs

Your frontend needs Google OAuth to work:

1. Go to: **https://console.cloud.google.com**
2. Select your project → **APIs & Services** → **Credentials**
3. Click your **OAuth 2.0 Client ID**
4. Under **Authorized redirect URIs**, click **"+ ADD URI"**
5. Add:
   ```
   https://your-frontend.vercel.app
   https://your-frontend.vercel.app/api/auth/callback/google
   ```
6. Keep existing:
   ```
   http://localhost:3000
   http://localhost:3000/api/auth/callback/google
   ```
7. Click **"Save"**

---

## ✅ Verification Steps

### 1. Test Frontend
```
Visit: https://your-frontend.vercel.app
Should: Load homepage
```

### 2. Test API Connection
```
Open browser console (F12)
Navigate to a stock page
Should: See API requests to mockmarket-backend.onrender.com
```

### 3. Test Google Login
```
Click "Sign In with Google"
Should: Redirect to Google, then back to your app
```

### 4. Test End-to-End
```
✅ Login with Google
✅ Search for a stock (e.g., "RELIANCE")
✅ View stock detail page
✅ See live prices updating
✅ Place a test order
✅ Check order confirmation modal
✅ Add stock to watchlist
✅ Remove from watchlist
```

---

## 🚨 Common Issues & Fixes

### Issue 1: CORS Error in Browser Console
**Error:** `Access to fetch at 'https://mockmarket-backend.onrender.com' has been blocked by CORS policy`

**Fix:**
1. Check backend CORS settings (I just updated this!)
2. Redeploy backend: Render Dashboard → Manual Deploy
3. Wait 2 minutes for backend to restart

### Issue 2: "Network Error" on Frontend
**Cause:** Wrong backend URL in env vars

**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Verify `NEXT_PUBLIC_API_URL` = `https://mockmarket-backend.onrender.com`
3. Redeploy frontend

### Issue 3: Google Login Fails
**Cause:** Redirect URI not authorized

**Fix:**
1. Google Cloud Console → Add Vercel URL to authorized URIs
2. Try login again (may take 1-2 minutes to propagate)

### Issue 4: Backend is Slow (50+ seconds)
**Cause:** Render free tier cold start

**Fix:** Set up keep-alive (GitHub Actions cron) - see `DEPLOYMENT_GUIDE.md` Part 4

---

## 🎯 After Successful Deploy

### Your Production URLs:
```
Frontend: https://your-frontend.vercel.app
Backend:  https://mockmarket-backend.onrender.com
```

### Set Up Keep-Alive (Prevent Backend Sleep)

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Name: `BACKEND_URL`
4. Value: `https://mockmarket-backend.onrender.com`
5. Click **"Add secret"**

GitHub Actions will ping your backend every 10 minutes (already configured in `.github/workflows/keep-alive.yml`)!

---

## 🎉 Congratulations!

Once Vercel deploys successfully:
- ✅ Frontend on global CDN (instant worldwide)
- ✅ Backend on Render (with keep-alive)
- ✅ Database on Aiven
- ✅ **Total cost: $0/month**

Your MockMarket app is **LIVE** and **FREE FOREVER**! 🚀

---

## 📝 Quick Checklist

- [ ] Push backend CORS update
- [ ] Sign up for Vercel
- [ ] Import MockMarket repository
- [ ] Set Root Directory to `frontend`
- [ ] Add environment variables
- [ ] Deploy (wait 5-7 minutes)
- [ ] Update `NEXT_PUBLIC_SITE_URL` with actual Vercel URL
- [ ] Add Vercel URL to Google OAuth
- [ ] Test login, stock pages, orders
- [ ] Set up GitHub Actions keep-alive secret
- [ ] Share your app with the world!

**Need help?** Check `DEPLOYMENT_GUIDE.md` for more details!
