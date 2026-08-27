import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth-interceptor';
import { AuthService } from './auth';

describe('authInterceptor', () => {
  it('includes the stored token as an opaque Bearer credential', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: () => 'jwt-token', logout: () => undefined } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);
    client.get('/api/test').subscribe();
    const call = http.expectOne('/api/test');
    expect(call.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    call.flush({});
    http.verify();
  });
});
