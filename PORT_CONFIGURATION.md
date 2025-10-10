# Centralized Port Configuration

You can now change both frontend and backend ports from a single location without making changes to multiple files.

## 🚀 Quick Start

### Method 1: Simple Port Configuration (Recommended)
1. Edit `ports.env` file:
   ```bash
   PORT=3001           # Backend port
   FRONTEND_PORT=4201   # Frontend port
   ```

2. Run with custom ports:
   ```bash
   npm run dev:with-ports
   ```

### Method 2: Environment Variables
Set environment variables and run:
```bash
export PORT=3001 FRONTEND_PORT=4201
npm run dev:full
```

### Method 3: Setup Script
```bash
npm run start:custom
```
This uses the `setup-env.sh` script which can be customized.

## 📁 Configuration Files

- **`ports.env`** - Simple port configuration file (recommended)
- **`setup-env.sh`** - Advanced configuration script with environment variable handling
- **`apps/env/env.ts`** - Backend environment configuration (auto-updates from ports)

## 🔧 How It Works

1. **Port Environment Variables**: `PORT` (backend) and `FRONTEND_PORT` (frontend)
2. **Automatic URL Generation**: Backend and frontend URLs are automatically generated based on ports
3. **CORS Configuration**: Allowed origins are automatically configured based on frontend port
4. **Package.json Scripts**: Updated to use environment variables

## 📋 Default Configuration

| Service | Default Port | URL |
|---------|-------------|-----|
| Backend | 3001 | http://localhost:3001 |
| Frontend | 4201 | http://localhost:4201 |

## 🛠️ Changing Ports

To change both ports:

1. **Edit `ports.env`:**
   ```bash
   PORT=4000           # New backend port
   FRONTEND_PORT=5000  # New frontend port
   ```

2. **Restart development servers:**
   ```bash
   npm run dev:with-ports
   ```

The URLs, CORS origins, and all related configurations will automatically update!

## 🎯 Benefits

- ✅ **Single Configuration Point**: Change ports in one file
- ✅ **Automatic Updates**: All related configurations update automatically  
- ✅ **Environment Variable Support**: Works with system environment variables
- ✅ **Backward Compatible**: Existing configuration still works
- ✅ **Multiple Options**: Choose the configuration method that suits your workflow
