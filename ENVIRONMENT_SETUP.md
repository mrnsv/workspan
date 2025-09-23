# Environment Configuration Guide

This guide explains how to configure frontend and backend URLs for the Workspan application.

## 📁 Environment File Structure

```
apps/env/
├── .env                    # Your configuration file (create this)
├── .env.example           # Template file (reference)
├── env.ts                 # Environment loader
└── cookies.json           # Auto-generated session data
```

## 🔧 Configuration Steps

### 1. Create Environment File

Create `apps/env/.env` with the following configuration:

```bash
# Server Configuration
PORT=3000
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:4200

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200

# GreytHR API Configuration
SWIPES_URL=https://your-greythr-domain.com/api/attendance/info/{employeeId}/swipes
TOTAL_HOURS_URL=https://your-greythr-domain.com/api/attendance/info/{employeeId}/total-hours
INSIGHTS_URL=https://your-greythr-domain.com/api/attendance/insights/{employeeId}
COOKIE=your_greythr_session_cookie

# Automation Configuration (for cookie extraction)
GREYTHR_URL=https://your-greythr-domain.com/portal/ess/attendance/attendance-info
ATTENDANCE_INFO_URL=https://your-greythr-domain.com/portal/ess/attendance/attendance-info
# LOGIN_ID and PASSWORD removed for security - use frontend login form
```

### 2. Replace Placeholder Values

#### Required Configurations:
- `SWIPES_URL`: Your GreytHR domain's swipes API endpoint
- `TOTAL_HOURS_URL`: Your GreytHR domain's total hours API endpoint  
- `INSIGHTS_URL`: Your GreytHR domain's insights API endpoint
- `GREYTHR_URL`: Your GreytHR portal attendance page URL

#### Security Notice:
- **LOGIN_ID and PASSWORD**: No longer stored in environment files for security
- **Authentication**: Use the frontend login form to provide credentials securely
- **Cookie Refresh**: Credentials are sent directly to backend when refreshing sessions

#### Optional Configurations:
- `PORT`: Backend server port (default: 3000)
- `BACKEND_URL`: Backend server URL (default: http://localhost:3000)
- `FRONTEND_URL`: Frontend application URL (default: http://localhost:4200)
- `ALLOWED_ORIGINS`: CORS allowed origins (default: localhost:4200)

### 3. Production Configuration Examples

#### Local Development:
```bash
PORT=3000
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:4200
ALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
```

#### Network/LAN Access:
```bash
PORT=3000
BACKEND_URL=http://192.168.1.100:3000
FRONTEND_URL=http://192.168.1.100:4200
ALLOWED_ORIGINS=http://192.168.1.100:4200,http://localhost:4200
```

#### Production Deployment:
```bash
PORT=8080
BACKEND_URL=https://api.yourcompany.com
FRONTEND_URL=https://workspan.yourcompany.com
ALLOWED_ORIGINS=https://workspan.yourcompany.com
```

## 🎯 How It Works

### Backend Configuration
- The backend automatically loads configuration from `apps/env/.env`
- CORS is configured using `ALLOWED_ORIGINS`
- Server starts on the specified `PORT`
- Environment info is displayed on startup

### Frontend Configuration
- Services use `EnvironmentService` for dynamic URL configuration
- API base URL can be updated at runtime
- Configuration can be fetched from `/api/config` endpoint

### Dynamic Configuration
- Frontend can fetch current config: `GET /api/config`
- Backend serves configuration based on environment variables
- No need to rebuild frontend for URL changes

## 🚀 Startup Commands

```bash
# Start with environment configuration
npm run dev:full        # Both frontend and backend
npm start               # Backend only  
npm run frontend:serve  # Frontend only
```

## 🔍 Verification

### Check Backend Configuration:
```bash
curl http://localhost:3000/api/config
```

### Check Environment Loading:
- Backend startup logs show loaded configuration
- Verify CORS origins and URLs are correct
- Test API endpoints return expected data

### Troubleshooting:
1. **CORS Errors**: Check `ALLOWED_ORIGINS` includes your frontend URL
2. **Connection Refused**: Verify `BACKEND_URL` and `PORT` are correct
3. **API Not Found**: Ensure GreytHR URLs are properly configured
4. **Authentication**: Use the frontend login form to refresh session cookies
5. **Legacy get-token**: Direct script usage now requires credentials as parameters

## 🔐 Security Improvements

### Credential Management
- **No Persistent Storage**: LOGIN_ID and PASSWORD are never stored in files
- **Frontend Authentication**: Users enter credentials only through the login form
- **Secure Transmission**: Credentials are sent directly to backend via HTTPS
- **Memory Only**: Backend receives credentials temporarily for cookie refresh

### Authentication Flow
1. User enters credentials in frontend login form
2. Frontend sends credentials to `/api/refresh-cookie` endpoint
3. Backend uses credentials to extract new session cookie
4. Session cookie is stored in `cookies.json` (no credentials saved)
5. Credentials are discarded from memory after use

### Migration from Legacy Setup
If you have existing `.env` files with credentials:
1. Remove `LOGIN_ID=...` and `PASSWORD=...` lines from `.env`
2. Keep only the GreytHR URL configurations
3. Use the frontend login form for authentication going forward

## 📝 Notes

- `.env` files are ignored by git for security
- Use `cookies.json` for session management (auto-generated)
- Environment variables have sensible defaults for development
- Production deployments should use environment-specific URLs
- Credentials are never persisted - entered fresh each session
