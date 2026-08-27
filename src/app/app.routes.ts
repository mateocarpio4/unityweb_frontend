import { Routes } from '@angular/router';
import { authGuard } from './service/auth-guard';
export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | UnityBank',
    loadComponent: () => import('./login/login').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    title: 'Crear cuenta | UnityBank',
    loadComponent: () => import('./registro/registro').then((m) => m.RegistroPage),
  },
  {
    path: 'home',
    title: 'Inicio | UnityBank',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' },
];
