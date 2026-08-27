import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../service/auth';

@Component({selector:'app-registro',imports:[ReactiveFormsModule],templateUrl:'./registro.html'})
export class RegistroPage{
 private fb=inject(FormBuilder);private auth=inject(AuthService);private router=inject(Router);
 readonly loading=signal(false);readonly error=signal('');readonly showPassword=signal(false);
 readonly form=this.fb.nonNullable.group({
  nombre:['',[Validators.required,Validators.maxLength(100)]],
  email:['',[Validators.required,Validators.email]],
  password:['',[Validators.required,Validators.minLength(8)]],
  confirm:['',Validators.required],
  rol:['CLIENTE' as 'CLIENTE'|'ADMIN',Validators.required]
 });
 submit(){
  this.form.markAllAsTouched();this.error.set('');
  if(this.form.invalid)return;
  const{nombre,email,password,confirm,rol}=this.form.getRawValue();
  if(password!==confirm){this.error.set('Las contraseñas no coinciden.');return}
  if(rol==='ADMIN'){this.error.set('Por seguridad, una cuenta administradora debe ser creada desde el panel de otro administrador.');return}
  this.loading.set(true);
  this.auth.registro(nombre,email,password).pipe(finalize(()=>this.loading.set(false))).subscribe({
   next:()=>this.router.navigate(['/login'],{queryParams:{cuenta:'creada'}}),
   error:e=>this.error.set(e.error?.detail||'No pudimos crear la cuenta. Verifica los datos e inténtalo nuevamente.')
  });
 }
}
