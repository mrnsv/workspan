#!/bin/bash

# Workspan Network Sharing Script
# This script helps you share the application on your local network

echo "🌐 Workspan Network Sharing Setup"
echo "================================="

# Get your local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "📍 Your local IP address: $LOCAL_IP"

echo ""
echo "📋 Steps to share with teammates:"
echo "1. Start the backend server:"
echo "   npm start"
echo ""
echo "2. Start the frontend server with host binding:"
echo "   ng serve --host 0.0.0.0 --port 4200"
echo ""
echo "3. Share this URL with your teammates:"
echo "   http://$LOCAL_IP:4200"
echo ""
echo "✅ The frontend will automatically connect to:"
echo "   http://$LOCAL_IP:3000/api"
echo ""
echo "🔧 Backend Configuration:"
echo "   - Binds to 0.0.0.0:3000 (accessible from network)"
echo "   - CORS allows local network IPs"
echo ""
echo "🔧 Frontend Configuration:"
echo "   - Auto-detects backend URL based on current host"
echo "   - localhost → http://localhost:3000/api"
echo "   - network IP → http://$LOCAL_IP:3000/api"
echo ""
echo "⚠️  Make sure your firewall allows connections on ports 3000 and 4200"
