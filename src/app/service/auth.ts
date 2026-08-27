import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from './bank.models';
import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly api = environment.apiUrl;
  readonly user = signal<User | null>(this.readUser());
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/auth/login`, { email, contrasena: password })
      .pipe(tap((r) => this.save(r)));
  }
  registro(nombre: string, email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.api}/auth/registro`, {
      nombre,
      email,
      contrasena: password,
    });
  }
  refreshUser(): Observable<User> {
    return this.http.get<User>(`${this.api}/usuarios/me`).pipe(tap((user) => this.saveUser(user)));
  }
  logout() {
    if (this.browser) {
      localStorage.removeItem('unity_token');
      localStorage.removeItem('unity_user');
    }
    this.user.set(null);
  }
  isAuthenticated() {
    return this.browser && !!localStorage.getItem('unity_token');
  }
  token() {
    return this.browser ? localStorage.getItem('unity_token') : null;
  }
  private save(r: AuthResponse) {
    if (this.browser) {
      localStorage.setItem('unity_token', r.token);
      localStorage.setItem('unity_user', JSON.stringify(r.usuario));
    }
    this.user.set(r.usuario);
  }
  private saveUser(user: User) {
    if (this.browser) localStorage.setItem('unity_user', JSON.stringify(user));
    this.user.set(user);
  }
  private readUser(): User | null {
    if (!this.browser) return null;
    try {
      const raw = localStorage.getItem('unity_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
