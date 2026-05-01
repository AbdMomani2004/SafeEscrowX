# Render.com Deployment Guide

## Database Connection Fix

The application has been updated to properly handle Render.com's PostgreSQL database connection format.

### Changes Made

1. **Updated `database-postgres.js`**:
   - Added support for parsing `DATABASE_URL` environment variable (Render.com format)
   - Falls back to individual DB environment variables if `DATABASE_URL` is not available
   - Added debug logging to help troubleshoot connection issues

2. **Updated `server.js`**:
   - Modified to automatically use PostgreSQL in production environment
   - Fixed environment variable loading order - system env vars take precedence in production
   - Added debug logging to show which environment variables are being used
   - Prevents `.env` files from overriding Render's system environment variables

### Environment Variables Required on Render.com

The application will automatically detect and use Render's `DATABASE_URL` environment variable. Render provides this automatically when you create a PostgreSQL database.

**Your Render Database URLs:**
- **Internal URL**: `postgresql://escrowx_user:KraGISoGAdxaty2LmClKIxdarFSm4KWq@dpg-d3lupvemcj7s73a9au8g-a/escrowx_production`
- **External URL**: `postgresql://escrowx_user:KraGISoGAdxaty2LmClKIxdarFSm4KWq@dpg-d3lupvemcj7s73a9au8g-a.oregon-postgres.render.com/escrowx_production`

**Note**: Use the **Internal URL** for your Render web service, as it's faster and doesn't count against external connection limits.

**Manual Configuration (if needed):**
```
DATABASE_URL=postgresql://escrowx_user:KraGISoGAdxaty2LmClKIxdarFSm4KWq@dpg-d3lupvemcj7s73a9au8g-a/escrowx_production
# OR individual variables:
DB_HOST=dpg-d3lupvemcj7s73a9au8g-a.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=escrowx_production
DB_USER=escrowx_user
DB_PASSWORD=KraGISoGAdxaty2LmClKIxdarFSm4KWq
```

### Render.com Setup Steps

1. **Create a PostgreSQL Database**:
   - In your Render dashboard, create a new PostgreSQL database
   - Note the connection details

2. **Deploy Your Application**:
   - Connect your GitHub repository
   - Set the build command: `npm install`
   - Set the start command: `npm start`
   - Render will automatically provide the `DATABASE_URL` environment variable

3. **Verify Deployment**:
   - Check the logs for successful database connection
   - Look for: `✅ Connected to PostgreSQL database`
   - Database tables will be automatically created on first run

### Troubleshooting

If you still encounter connection issues:

1. **Check Render Logs**: Look for the debug output showing database configuration:
   ```
   🚀 Production mode: Using system environment variables only
   🔍 Environment check: { DATABASE_URL: 'SET', ... }
   🔧 Database configuration: { host: 'dpg-d3lupvemcj7s73a9au8g-a.oregon-postgres.render.com', ... }
   ✅ Connected to PostgreSQL database
   ```

2. **Verify Database Status**: Ensure your PostgreSQL database is running on Render
3. **Check Environment Variables**: Verify that `DATABASE_URL` is properly set in Render dashboard
4. **SSL Configuration**: The app automatically handles SSL for production connections
5. **Use Internal URL**: Make sure you're using the internal database URL (without `.oregon-postgres.render.com`) for better performance

**Expected Log Output on Successful Connection:**
```
🚀 Production mode: Using system environment variables only
🔍 Environment check: {
  NODE_ENV: 'production',
  USE_POSTGRESQL: undefined,
  DATABASE_URL: 'SET',
  DB_HOST: undefined,
  DB_USER: undefined,
  DB_NAME: undefined
}
🔧 Database configuration: {
  host: 'dpg-d3lupvemcj7s73a9au8g-a.oregon-postgres.render.com',
  port: 5432,
  database: 'escrowx_production',
  user: 'escrowx_user',
  ssl: { rejectUnauthorized: false },
  hasPassword: true
}
✅ Connected to PostgreSQL database
✅ PostgreSQL database tables initialized successfully
```

### Local Development

For local development, you can either:
- Use SQLite (default): No additional setup required
- Use PostgreSQL: Set `USE_POSTGRESQL=true` and configure your local PostgreSQL connection

The application will automatically choose the appropriate database based on the environment.
