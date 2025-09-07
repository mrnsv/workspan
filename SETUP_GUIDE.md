# 🚀 Quick Setup Guide for Workspan

## Overview
This guide will help you set up the complete Workspan application with backend API, frontend interface, and automation features.

## Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)
- Git
- Chrome/Chromium browser (for automation)

## Quick Start

### 1. Install Dependencies
```bash
# Install all dependencies (consolidated: backend + frontend + automation)
npm install
```

### 2. Configure Environment
```bash
# Create environment configuration
mkdir -p apps/env
```

Create `apps/env/.env` with your credentials:
```env
# Automation credentials
ATTENDANCE_INFO_URL="https://waydot.greythr.com/latte/v3/attendance/info/689"
LOGIN_ID="your_login_id"
PASSWORD="your_password"

# API endpoints  
SWIPES_URL="https://waydot.greythr.com/latte/v3/attendance/info/689/swipes"
COOKIE="your_session_cookie_will_be_auto_generated"
```

### 3. Set Up Automation (Optional)
```bash
# Install Playwright browsers
npm run install-browsers

# Validate configuration
npm run test-config
```

### 4. Get Initial Cookie
```bash
# Extract authentication cookie
npm run get-token
```

### 5. Start the Applications

#### Option 1: Full Development Mode (Recommended)
```bash
npm run dev:full
```
This starts:
- Backend API on http://localhost:3000
- Frontend UI on http://localhost:4200

#### Option 2: Individual Services
```bash
# Terminal 1: Backend
npm start

# Terminal 2: Frontend
npm run frontend:serve
```

## Application URLs

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api endpoints

### Key API Endpoints
- `GET /api/hours/sessions?date=YYYY-MM-DD` - Work sessions
- `GET /api/swipes?date=YYYY-MM-DD` - Raw swipe data
- `GET /ping` - Health check

## Features Available

### Frontend Features ✨
- **Dark Theme**: Modern glass morphism design
- **Work Hours Display**: Real-time calculation with progress bars
- **Date Picker**: Navigate through historical data
- **Login Form**: Enter credentials and refresh cookies
- **Session View**: Detailed work session breakdown
- **Swipe Accordions**: Expandable raw swipe data
- **Responsive**: Works on all devices

### Backend Features 🔧
- **RESTful API**: Clean, documented endpoints
- **Auto Cookie Refresh**: Handles expired sessions
- **Timezone Handling**: UTC to IST conversion
- **Work Hours Calculation**: Multiple calculation methods
- **Error Handling**: Robust error recovery

### Automation Features 🤖
- **Cookie Extraction**: Automated login and session capture
- **Browser Automation**: Playwright-powered
- **Smart Detection**: Handles different login flows
- **Auto Integration**: Updates backend automatically

## Daily Usage

### Method 1: Automatic Cookie Management
1. Open http://localhost:4200
2. Use the "Quick Refresh" button if needed
3. View your work hours and attendance data

### Method 2: Manual Cookie Refresh
```bash
# When you get authentication errors
npm run refresh-cookie
```

### Method 3: Full Manual Setup
1. Login to GreytHR manually
2. Extract cookie from browser dev tools
3. Update `apps/env/.env` manually
4. Restart backend

## Troubleshooting

### Common Issues

#### 1. "Cookie expired" or 403 errors
```bash
# Solution: Refresh authentication
npm run refresh-cookie
```

#### 2. Frontend won't connect to backend
- Ensure backend is running on port 3000
- Check browser console for CORS errors
- Verify API endpoints in frontend service

#### 3. Automation fails
```bash
# Validate configuration
npm run test-config

# Check browser installation
npm run install-browsers
```

#### 4. Port conflicts
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :4200

# Kill conflicting processes
sudo kill -9 <PID>
```

## Development Tips

### Debugging
- Backend logs appear in the terminal running `npm start`
- Frontend logs appear in browser dev tools console
- Automation logs appear during `npm run get-token`

### File Watching
- Backend auto-restarts on file changes with `npm run dev`
- Frontend auto-reloads on file changes with `npm run frontend:serve`

### API Testing
```bash
# Test backend directly
curl http://localhost:3000/ping
curl "http://localhost:3000/api/hours/sessions?date=2025-01-04"
```

## Project Structure Summary

```
workspan/
├── apps/
│   ├── frontend/          # Angular application
│   ├── backend/           # Express.js API
│   ├── automation/        # Playwright scripts
│   └── env/              # Shared configuration
├── package.json          # Root dependencies
└── README.md             # Full documentation
```

## Next Steps

1. **First Time**: Follow this guide completely
2. **Daily Use**: Just run `npm run dev:full`
3. **Authentication Issues**: Use `npm run refresh-cookie`
4. **Development**: Modify components in `apps/frontend/src/app/`

## Support

- Check the main README.md for detailed documentation
- Review component-specific README files
- Check browser console and terminal logs for errors
- Ensure all environment variables are properly configured

---

🎉 **You're all set!** Open http://localhost:4200 to start tracking your work hours.
