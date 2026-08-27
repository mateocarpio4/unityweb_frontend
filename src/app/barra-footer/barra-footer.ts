import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-barra-footer',
  templateUrl: './barra-footer.html',
  styleUrl: './barra-footer.css',
})
export class BarraFooter {
  private router = inject(Router);
  get ocultar() {
    return this.router.url.startsWith('/login') || this.router.url.startsWith('/registro');
  }
}
