import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './service/auth-interceptor';
import { routes } from './app.routes';
export const appConfig:ApplicationConfig={providers:[provideBrowserGlobalErrorListeners(),provideRouter(routes),provideHttpClient(withFetch(),withInterceptors([authInterceptor])),provideClientHydration(withEventReplay())]};
