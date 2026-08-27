import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../service/auth';
@Component({ selector: 'app-login', imports: [ReactiveFormsModule], templateUrl: './login.html' })
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);
  readonly success = signal(
    this.route.snapshot.queryParamMap.get('cuenta') === 'creada'
      ? 'Tu cuenta fue creada correctamente. Ya puedes iniciar sesión.'
      : '',
  );
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (e) => {
        if (e.status === 0) {
          this.error.set(
            'No pudimos conectar con UnityBank Backend. Verifica que Spring Boot esté iniciado.',
          );
        } else if (e.status === 401) {
          this.error.set('Correo o contraseña incorrectos. Intenta nuevamente.');
        } else {
          this.error.set(e.error?.detail || 'No pudimos iniciar sesión en este momento.');
        }
        this.loading.set(false);
      },
    });
  }
}
