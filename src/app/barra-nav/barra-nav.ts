import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../service/auth';
import { MessageService } from '../service/mensajes';
@Component({
  selector: 'app-barra-nav',
  imports: [RouterLink, DatePipe],
  templateUrl: './barra-nav.html',
  styleUrl: './barra-nav.css',
})
export class BarraNav {
  readonly auth = inject(AuthService);
  readonly messages = inject(MessageService);
  readonly menuOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly messagesOpen = signal(false);
  readonly activeSection = signal('inicio');
  private router = inject(Router);
  readonly initials = computed(
    () =>
      this.auth
        .user()
        ?.nombre?.trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'UB',
  );
  constructor() {
    this.syncSection(this.router.url);
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => this.syncSection(event.urlAfterRedirects));
  }
  get ocultar() {
    return this.router.url.startsWith('/login') || this.router.url.startsWith('/registro');
  }
  setSection(section: string) {
    this.activeSection.set(section);
    this.menuOpen.set(false);
  }
  toggleMessages() {
    this.profileOpen.set(false);
    this.messagesOpen.update((open) => !open);
  }
  toggleProfile() {
    this.messagesOpen.set(false);
    this.profileOpen.update((open) => !open);
  }
  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
  private syncSection(url: string) {
    this.activeSection.set(url.split('#')[1] || 'inicio');
  }
}
