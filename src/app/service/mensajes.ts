import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth';

export interface BankMessage {
  id: string;
  userId: number;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly storageKey = 'unity_messages';
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly auth = inject(AuthService);
  private readonly storedMessages = signal<BankMessage[]>(this.readStored());

  readonly messages = computed(() => {
    const userId = this.auth.user()?.id;
    return userId
      ? this.storedMessages()
          .filter(message => message.userId === userId)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      : [];
  });
  readonly unreadCount = computed(() => this.messages().filter(message => !message.read).length);

  constructor() {
    if (this.browser) {
      window.addEventListener('storage', event => {
        if (event.key === this.storageKey) this.storedMessages.set(this.readStored());
      });
    }
  }

  sendTo(userId: number, title: string, body: string) {
    if (!this.browser) return;
    const message: BankMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false
    };
    this.save([message, ...this.storedMessages()].slice(0, 100));
  }

  markAsRead(id: string) {
    this.save(this.storedMessages().map(message => message.id === id ? { ...message, read: true } : message));
  }

  markAllAsRead() {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.save(this.storedMessages().map(message => message.userId === userId ? { ...message, read: true } : message));
  }

  private save(messages: BankMessage[]) {
    this.storedMessages.set(messages);
    if (this.browser) localStorage.setItem(this.storageKey, JSON.stringify(messages));
  }

  private readStored(): BankMessage[] {
    if (!this.browser) return [];
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? '[]') as BankMessage[];
    } catch {
      return [];
    }
  }
}
