# Workspan Frontend

A modern, dark-themed Angular application for tracking work hours and attendance data.

## Features

### 🎨 Modern Dark Theme
- Beautiful gradient backgrounds with glass morphism effects
- Animated cards with hover effects
- Custom Material Design dark theme
- Responsive design for all screen sizes

### 📊 Work Hours Display
- Real-time work hours calculation
- Visual progress indicators
- Shortfall and excess hours display
- Completion percentage tracking
- Daily requirement status (8 hours minimum)

### 🔐 Authentication Management
- Login form for credentials input
- Cookie refresh functionality
- Quick refresh option
- Real-time authentication status

### 📅 Date Navigation
- Interactive date picker
- Historical data viewing
- Current date highlighting
- Smooth date transitions

### 📈 Detailed Analytics
- Work session breakdown
- Swipe data accordions
- Session timing analysis
- Raw swipe records

### 🔄 Real-time Updates
- Auto-refresh capabilities
- Loading states with spinners
- Error handling with retry options
- Snackbar notifications

## Technology Stack

- **Framework**: Angular 17
- **UI Library**: Angular Material
- **Styling**: SCSS with custom themes
- **Icons**: Material Icons
- **Animations**: Angular Animations
- **HTTP Client**: Angular HttpClient
- **State Management**: RxJS Observables

## Project Structure

```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── login-form/          # Authentication component
│   │   │   ├── work-hours/          # Main work hours display
│   │   │   ├── swipe-data/          # Swipe data with accordions
│   │   │   └── stats-card/          # Reusable stats card
│   │   ├── models/
│   │   │   └── work-hours.model.ts  # TypeScript interfaces
│   │   ├── services/
│   │   │   ├── work-hours.service.ts # API integration
│   │   │   └── auth.service.ts      # Authentication service
│   │   ├── app.component.*          # Root component
│   │   └── app.module.ts            # App module configuration
│   ├── assets/                      # Static assets
│   ├── styles.scss                  # Global styles
│   ├── index.html                   # Main HTML template
│   └── main.ts                      # Application bootstrap
├── angular.json                     # Angular CLI configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies and scripts
```

## Setup and Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Angular CLI (optional, but recommended)

### Installation Steps

1. **Install dependencies**
   ```bash
   cd apps/frontend
   npm install
   ```

2. **Install Angular CLI (if not already installed)**
   ```bash
   npm install -g @angular/cli
   ```

3. **Start the development server**
   ```bash
   npm run serve
   ```

4. **Open the application**
   Navigate to `http://localhost:4200`

## Available Scripts

```bash
# Development server
npm run serve          # Starts dev server on http://localhost:4200

# Build
npm run build          # Build for production
npm run watch          # Build with file watching

# Testing
npm run test           # Run unit tests
```

## Configuration

### Backend API Integration

The frontend connects to the backend API running on `http://localhost:3000`. 

Key endpoints used:
- `GET /api/hours/sessions` - Work hours with sessions
- `GET /api/swipes` - Raw swipe data
- `GET /api/hours/daily` - Daily summary
- `POST /api/refresh-cookie` - Cookie refresh

### Environment Configuration

Update the API base URL in `src/app/services/work-hours.service.ts`:

```typescript
private readonly API_BASE_URL = 'http://localhost:3000/api';
```

## Component Overview

### LoginFormComponent
- **Purpose**: Handle user authentication
- **Features**: Login ID/Password input, cookie refresh, validation
- **Location**: `src/app/components/login-form/`

### WorkHoursComponent  
- **Purpose**: Display work hours and statistics
- **Features**: Progress tracking, shortfall/excess calculation, visual indicators
- **Location**: `src/app/components/work-hours/`

### SwipeDataComponent
- **Purpose**: Show detailed swipe information
- **Features**: Session accordions, raw swipe data, time formatting
- **Location**: `src/app/components/swipe-data/`

### StatsCardComponent
- **Purpose**: Reusable statistics display card
- **Features**: Icon, title, value display with theming
- **Location**: `src/app/components/stats-card/`

## Styling and Theming

### Dark Theme
The application uses a custom dark theme with:
- Primary: Blue palette (#667eea)
- Accent: Cyan palette (#00BCD4)
- Background: Dark gradients
- Glass morphism effects

### Responsive Design
- Mobile-first approach
- Breakpoints at 768px and 480px
- Grid layouts that adapt to screen size
- Touch-friendly interface elements

### Custom Animations
- Card hover effects
- Loading spinners
- Pulse animations for active elements
- Smooth transitions

## API Integration

### Work Hours Service
Handles all backend communication:
- Work hours retrieval
- Swipe data fetching
- Statistics calculation
- Date formatting

### Auth Service
Manages authentication:
- Cookie refresh functionality
- Credential updates
- Connection testing

## Error Handling

- Network error recovery
- Loading states management
- User-friendly error messages
- Retry mechanisms
- Graceful degradation

## Performance Optimizations

- OnPush change detection where applicable
- Lazy loading of components
- Optimized bundle size
- Efficient RxJS operators
- Material Design best practices

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Guidelines

### Code Style
- Follow Angular style guide
- Use TypeScript strict mode
- Consistent component structure
- SCSS for styling

### Component Structure
```typescript
// Component order
1. Imports
2. Component decorator
3. Class definition
4. Properties (inputs, outputs, etc.)
5. Constructor
6. Lifecycle hooks
7. Public methods
8. Private methods
```

## Troubleshooting

### Common Issues

1. **Backend connection failed**
   - Ensure backend is running on port 3000
   - Check CORS configuration
   - Verify API endpoints

2. **Cookie refresh not working**
   - Check authentication credentials
   - Verify automation scripts are working
   - Check browser console for errors

3. **Styling issues**
   - Clear browser cache
   - Check Material theme imports
   - Verify SCSS compilation

### Debug Mode
Enable debug logging by adding to `environment.ts`:
```typescript
export const environment = {
  production: false,
  debug: true,
  apiUrl: 'http://localhost:3000/api'
};
```

## Future Enhancements

- [ ] PWA capabilities
- [ ] Offline data caching
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering options
- [ ] Export functionality
- [ ] Multiple language support
- [ ] Accessibility improvements
- [ ] Mobile app version

## Contributing

1. Follow the existing code style
2. Add proper TypeScript types
3. Include unit tests for new features
4. Update documentation as needed
5. Test on multiple screen sizes

---

Built with ❤️ using Angular and Material Design
