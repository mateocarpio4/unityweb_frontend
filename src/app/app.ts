import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarraNav } from './barra-nav/barra-nav';
import { BarraFooter } from './barra-footer/barra-footer';
@Component({selector:'app-root',imports:[RouterOutlet,BarraNav,BarraFooter],templateUrl:'./app.html',styleUrl:'./app.css'})
export class App {}
