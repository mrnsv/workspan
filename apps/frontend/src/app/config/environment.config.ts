export interface AppEnvironment {
  production: boolean;
  apiBaseUrl: string;
  frontendUrl: string;
}

// Auto-detect backend URL based on current host
function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    
    // If accessing via localhost, use localhost backend on port 3201
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return 'http://localhost:3201/api';
    }
    
    // If accessing via local network IP, use same IP for backend on port 3201
    return `http://${currentHost}:3201/api`;
  }
  
  // Fallback for server-side rendering
  return 'http://localhost:3201/api';
}

// These values can be overridden at build time or runtime
export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: getBackendUrl(),
  frontendUrl: 'http://localhost:4201'
};

// Runtime environment override (can be set by backend or config service)
export class EnvironmentService {
  private static instance: EnvironmentService;
  private currentEnvironment: AppEnvironment = environment;

  private constructor() {}

  static getInstance(): EnvironmentService {
    if (!EnvironmentService.instance) {
      EnvironmentService.instance = new EnvironmentService();
    }
    return EnvironmentService.instance;
  }

  updateEnvironment(newConfig: Partial<AppEnvironment>): void {
    this.currentEnvironment = { ...this.currentEnvironment, ...newConfig };
  }

  getEnvironment(): AppEnvironment {
    return this.currentEnvironment;
  }

  getApiBaseUrl(): string {
    return this.currentEnvironment.apiBaseUrl;
  }

  getFrontendUrl(): string {
    return this.currentEnvironment.frontendUrl;
  }
}
