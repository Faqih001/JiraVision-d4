# Vercel Deployment Guide for JiraVision

## 🚨 CRITICAL: Before Deployment

### 1. Rotate Database Credentials (URGENT)
Your database credentials were exposed in GitHub. Follow these steps immediately:

1. **Rotate Neon Database Password:**
   - Go to [Neon Console](https://console.neon.tech)
   - Navigate to your project: `ep-late-sky-ahc686x6`
   - Go to Settings → Reset Password
   - Generate new password
   - Update your local `.env` file with new `DATABASE_URL`

2. **Remove Credentials from Git History:**
   ```bash
   # Add .env to .gitignore if not already present
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore
   
   # Commit the .gitignore update
   git add .gitignore
   git commit -m "Add .env to .gitignore"
   
   # Push to GitHub
   git push origin main
   ```

3. **Test New Connection:**
   ```bash
   npm run neon:test
   ```

## 📋 Pre-Deployment Checklist

- [ ] Database credentials rotated
- [ ] `.env` added to `.gitignore`
- [ ] All environment variables ready
- [ ] Local build successful (`npm run build`)
- [ ] Production readiness check passed (`npm run production:check`)

## 🔧 Vercel Environment Variables

Configure these in your Vercel project settings (Settings → Environment Variables):

### Required Variables:

```bash
DATABASE_URL='postgresql://neondb_owner:NEW_PASSWORD@ep-late-sky-ahc686x6-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'

NODE_ENV='production'

NEXT_PUBLIC_APP_URL='https://your-app.vercel.app'

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET='your-generated-secure-secret-here'
```

### Optional Variables:

```bash
RESEND_API_KEY='your-resend-api-key-here'

NEXT_PUBLIC_SOCKET_URL='https://your-socket-server.com'
```

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Import Your Project:**
   - Click "Add New..." → "Project"
   - Import from GitHub: `Faqih001/JiraVision-d4`
   - Select the repository

3. **Configure Project:**
   - Framework Preset: **Next.js**
   - Root Directory: `./` (leave default)
   - Build Command: `npm run build`
   - Output Directory: `.next` (leave default)
   - Install Command: `npm install`

4. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add all variables from above
   - **IMPORTANT:** Set for Production, Preview, and Development

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel --prod

# Follow prompts to configure
```

## 🔍 Common Deployment Issues & Fixes

### Issue 1: Build Fails - Missing Environment Variables
**Error:** `DATABASE_URL is not defined`

**Fix:**
- Add `DATABASE_URL` to Vercel environment variables
- Ensure it's set for all environments (Production, Preview, Development)
- Redeploy

### Issue 2: Database Connection Fails
**Error:** `Connection timeout` or `Authentication failed`

**Fix:**
- Verify `DATABASE_URL` format includes `?sslmode=require`
- Check Neon project is active (not paused)
- Ensure IP whitelist in Neon allows all IPs (0.0.0.0/0) for serverless

### Issue 3: Build Fails - TypeScript Errors
**Note:** Already handled in `next.config.mjs`

```javascript
typescript: {
  ignoreBuildErrors: true,
}
```

### Issue 4: Build Fails - ESLint Errors
**Note:** Already handled in `next.config.mjs`

```javascript
eslint: {
  ignoreDuringBuilds: true,
}
```

### Issue 5: Socket.IO Connection Fails
**Fix:**
- Update `NEXT_PUBLIC_SOCKET_URL` to your socket server URL
- If not using WebSockets, set to `https://your-app.vercel.app`

### Issue 6: Image Optimization Fails
**Note:** Already handled in `next.config.mjs`

```javascript
images: {
  unoptimized: true,
}
```

## 🔐 Neon Database Configuration for Vercel

### Enable Connection Pooling
Your current connection string already uses pooling (`-pooler` endpoint).

### Verify SSL Mode
Ensure your `DATABASE_URL` includes `?sslmode=require`

### Check Project Status
1. Go to [Neon Console](https://console.neon.tech)
2. Verify project status is "Active"
3. Check no compute time limits are reached

## 📊 Post-Deployment Verification

After successful deployment:

1. **Check Deployment Logs:**
   ```
   https://vercel.com/[your-team]/[project-name]/deployments
   ```

2. **Test Database Connection:**
   - Visit: `https://your-app.vercel.app/api/status`
   - Should return: `{"status": "ok", "database": "connected"}`

3. **Test API Routes:**
   - Visit: `https://your-app.vercel.app/api/db-test`
   - Should show database tables

4. **Test Authentication:**
   - Go to: `https://your-app.vercel.app/signup`
   - Try creating an account

## 🔄 Redeploy After Fixes

If deployment failed:

1. **Fix Issues** (update environment variables, code, etc.)
2. **Trigger Redeploy:**
   - Go to Deployments tab
   - Click "Redeploy" on failed deployment
   - Or push new commit to trigger automatic deployment

## 📝 Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | Neon PostgreSQL connection string with pooling |
| `NODE_ENV` | ✅ Yes | Set to `production` |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Your Vercel app URL |
| `JWT_SECRET` | ✅ Yes | Secure random 64-char string |
| `RESEND_API_KEY` | ❌ No | For email functionality |
| `NEXT_PUBLIC_SOCKET_URL` | ❌ No | For WebSocket functionality |

## 🛡️ Security Best Practices

1. **Never commit `.env` files**
2. **Rotate credentials regularly**
3. **Use strong JWT secrets** (64+ characters)
4. **Enable Vercel security headers**
5. **Set up Vercel deployment protection**

## 📞 Support

- **Vercel Support:** https://vercel.com/help
- **Neon Support:** https://neon.tech/docs/introduction
- **Check Deployment Logs:** Vercel Dashboard → Deployments → [Your Deployment] → Runtime Logs

## ✅ Deployment Success Checklist

After deployment completes successfully:

- [ ] Visit your app URL
- [ ] Test homepage loads
- [ ] Test signup/login works
- [ ] Test dashboard loads
- [ ] Check API endpoints work
- [ ] Verify database queries execute
- [ ] Test chat functionality (if using WebSockets)
- [ ] Check browser console for errors

---

**Need Help?** Check the deployment logs in Vercel Dashboard for specific error messages.
