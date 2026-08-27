import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../service/auth';
import { MessageService } from '../service/mensajes';
import { MovementService } from '../servicio/movimientos';
import { createIdempotencyKey } from '../service/transfer-utils';
import {
  AccountPayload,
  Movement,
  MovementPayload,
  MovementType,
  Summary,
  TransferenciaRequest,
  TransferenciaResponse,
  User,
} from '../service/bank.models';

type View = 'inicio' | 'movimientos' | 'transferencias' | 'reportes' | 'clientes';
type TransferStep = 'form' | 'confirm' | 'receipt';

@Component({
  selector: 'app-home',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private api = inject(MovementService);
  private auth = inject(AuthService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  readonly user = this.auth.user;
  readonly movements = signal<Movement[]>([]);
  readonly users = signal<User[]>([]);
  readonly selectedUserId = signal<number | null>(null);
  readonly summary = signal<Summary>({
    cantidadDepositos: 0,
    totalDepositos: 0,
    cantidadRetiros: 0,
    totalRetiros: 0,
    balanceMovimientos: 0,
  });
  readonly loading = signal(true);
  readonly menuOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly modalOpen = signal(false);
  readonly transferModalOpen = signal(false);
  readonly transferLoading = signal(false);
  readonly transferStep = signal<TransferStep>('form');
  readonly idempotencyKey = signal('');
  readonly transferReceipt = signal<TransferenciaResponse | null>(null);
  readonly transfers = signal<TransferenciaResponse[]>([]);
  readonly transfersLoading = signal(false);
  readonly transfersError = signal('');
  readonly accountModalOpen = signal(false);
  readonly accountLoading = signal(false);
  readonly expenseReceipt = signal<Movement | null>(null);
  readonly deleteTarget = signal<Movement | null>(null);
  readonly deleting = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly search = signal('');
  readonly typeFilter = signal<'TODOS' | MovementType>('TODOS');
  readonly toast = signal('');
  readonly activeView = signal<View>('inicio');
  readonly skeletonRows = [1, 2, 3, 4];
  readonly form = this.fb.nonNullable.group({
    tipo: ['DEPOSITO' as MovementType, Validators.required],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    descripcion: ['', [Validators.required, Validators.maxLength(80)]],
    usuarioId: [null as number | null],
  });
  readonly transferForm = this.fb.nonNullable.group({
    numeroCuentaDestino: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
    concepto: ['', Validators.maxLength(120)],
    monto: [
      0,
      [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+(\.\d{1,2})?$/)],
    ],
  });
  readonly accountForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['CLIENTE' as 'CLIENTE' | 'ADMIN', Validators.required],
  });
  readonly clients = computed(() => this.users().filter((x) => x.rol === 'CLIENTE'));
  readonly selectedUser = computed(
    () => this.users().find((x) => x.id === this.selectedUserId()) || null,
  );
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.movements().filter(
      (x) =>
        (this.typeFilter() === 'TODOS' || x.tipo === this.typeFilter()) &&
        (!q ||
          (x.descripcion ?? '').toLowerCase().includes(q) ||
          x.usuarioNombre.toLowerCase().includes(q)),
    );
  });
  readonly income = computed(() => Number(this.summary().totalDepositos));
  readonly expenses = computed(() => Number(this.summary().totalRetiros));
  readonly balance = computed(() =>
    Number(this.selectedUser()?.saldo ?? this.user()?.saldo ?? this.summary().balanceMovimientos),
  );
  readonly savingRate = computed(() =>
    this.income() ? Math.max(0, Math.round((this.balance() / this.income()) * 100)) : 0,
  );
  readonly maxChart = computed(() => Math.max(this.income(), this.expenses(), 1));

  constructor() {
    this.auth.refreshUser().subscribe({
      next: (user) => {
        if (user.rol === 'ADMIN') this.loadUsers();
      },
      error: () => {},
    });
    this.loadData();
    this.route.fragment.subscribe((fragment) => {
      if (
        fragment === 'movimientos' ||
        fragment === 'transferencias' ||
        fragment === 'reportes' ||
        fragment === 'clientes'
      )
        this.activeView.set(fragment);
      else this.activeView.set('inicio');
    });
  }
  setView(view: View) {
    this.activeView.set(view);
    if (view === 'transferencias') this.loadTransfers(this.selectedUserId());
    this.menuOpen.set(false);
  }
  selectUser(value: string) {
    const id = value ? Number(value) : null;
    this.selectedUserId.set(id);
    this.loadData(id);
    if (this.activeView() === 'transferencias') this.loadTransfers(id);
  }
  viewClient(client: User) {
    this.selectedUserId.set(client.id);
    this.activeView.set('movimientos');
    this.loadData(client.id);
  }
  openCreate(tipo: MovementType = 'DEPOSITO', client?: User) {
    this.editingId.set(null);
    const usuarioId = client?.id || this.selectedUserId();
    this.form.reset({ tipo, monto: 0, descripcion: '', usuarioId });
    this.modalOpen.set(true);
  }
  openTransfer() {
    if (this.user()?.rol === 'ADMIN') {
      this.notify('Las transferencias se realizan desde una sesión de cliente');
      return;
    }
    this.transferForm.reset({
      numeroCuentaDestino: '',
      concepto: '',
      monto: 0,
    });
    this.idempotencyKey.set(createIdempotencyKey());
    this.transferReceipt.set(null);
    this.transferStep.set('form');
    this.transferModalOpen.set(true);
  }
  reviewTransfer() {
    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }
    const raw = this.transferForm.getRawValue();
    if (raw.numeroCuentaDestino === this.user()?.numeroCuenta) {
      this.notify('No puedes transferir a tu propia cuenta');
      return;
    }
    if (Number(raw.monto) > Number(this.user()?.saldo ?? 0)) {
      this.notify('El monto supera tu saldo disponible');
      return;
    }
    this.transferStep.set('confirm');
  }
  saveTransfer() {
    if (this.transferForm.invalid || this.transferLoading() || this.transferStep() !== 'confirm')
      return;
    const raw = this.transferForm.getRawValue();
    const payload: TransferenciaRequest = {
      numeroCuentaDestino: raw.numeroCuentaDestino,
      monto: Number(raw.monto),
      concepto: raw.concepto.trim() || undefined,
      idempotencyKey: this.idempotencyKey(),
      banco: 'UnityBank',
    };
    this.transferLoading.set(true);
    this.api.transferir(payload).subscribe({
      next: (receipt) => {
        this.transferLoading.set(false);
        this.transferReceipt.set(receipt);
        this.transferStep.set('receipt');
        this.auth.refreshUser().subscribe({ error: () => {} });
        this.loadData(this.selectedUserId());
        this.loadTransfers();
        this.notify('Transferencia registrada correctamente');
      },
      error: (e) => {
        this.transferLoading.set(false);
        if (e.status !== 0) this.idempotencyKey.set(createIdempotencyKey());
        this.notify(this.transferError(e));
      },
    });
  }
  closeTransfer() {
    if (this.transferLoading()) return;
    this.transferModalOpen.set(false);
  }
  openTransferReceipt(referencia: string) {
    this.api.obtenerTransferencia(referencia).subscribe({
      next: (receipt) => {
        this.transferReceipt.set(receipt);
        this.transferStep.set('receipt');
        this.transferModalOpen.set(true);
      },
      error: (e) => this.notify(this.transferError(e)),
    });
  }
  openAccountModal() {
    this.accountForm.reset({ nombre: '', email: '', contrasena: '', rol: 'CLIENTE' });
    this.accountModalOpen.set(true);
  }
  saveAccount() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    this.accountLoading.set(true);
    this.api.createAccount(this.accountForm.getRawValue() as AccountPayload).subscribe({
      next: (user) => {
        this.accountLoading.set(false);
        this.accountModalOpen.set(false);
        this.loadUsers();
        this.notify(`Cuenta ${user.rol === 'ADMIN' ? 'administradora' : 'de cliente'} creada`);
      },
      error: (e) => {
        this.accountLoading.set(false);
        this.notify(e.error?.detail || 'No se pudo crear la cuenta');
      },
    });
  }
  edit(x: Movement) {
    this.editingId.set(x.id);
    this.form.setValue({
      tipo: x.tipo,
      monto: Number(x.monto),
      descripcion: x.descripcion ?? '',
      usuarioId: x.usuarioId,
    });
    this.modalOpen.set(true);
  }
  isTransfer(x: Movement) {
    return x.origenMovimiento === 'TRANSFERENCIA';
  }
  displayDescription(x: Movement) {
    return x.descripcion || (this.isTransfer(x) ? 'Transferencia UnityBank' : 'Sin descripción');
  }
  movementAccount(x: Movement) {
    return this.users().find((user) => user.id === x.usuarioId)?.numeroCuenta || 'Cuenta UnityBank';
  }
  closeExpenseReceipt() {
    this.expenseReceipt.set(null);
  }
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (this.user()?.rol === 'ADMIN' && !this.editingId() && !raw.usuarioId) {
      this.notify('Selecciona el cliente para esta operación');
      return;
    }
    const payload: MovementPayload = {
      tipo: raw.tipo,
      monto: Number(raw.monto),
      descripcion: raw.descripcion,
      usuarioId: raw.usuarioId,
    };
    const id = this.editingId(),
      request = id ? this.api.update(id, payload) : this.api.create(payload);
    request.subscribe({
      next: (saved) => {
        if (this.user()?.rol === 'ADMIN')
          this.notifyClient(
            saved.usuarioId,
            id
              ? 'Movimiento actualizado por administración'
              : 'Nuevo movimiento registrado por administración',
            `${saved.tipo === 'DEPOSITO' ? 'Ingreso' : 'Retiro'} de $${Number(saved.monto).toFixed(2)} · ${saved.descripcion || 'Sin descripción'}`,
          );
        this.modalOpen.set(false);
        if (this.user()?.rol === 'ADMIN' && !id && saved.tipo === 'RETIRO') {
          this.expenseReceipt.set(saved);
        }
        this.auth.refreshUser().subscribe({ error: () => {} });
        this.loadData(this.selectedUserId());
        this.notify(id ? 'Movimiento actualizado' : 'Movimiento registrado');
      },
      error: (e) => this.notify(e.error?.detail || 'No se pudo guardar el movimiento'),
    });
  }
  requestRemove(x: Movement) {
    this.deleteTarget.set(x);
  }
  cancelRemove() {
    if (!this.deleting()) this.deleteTarget.set(null);
  }
  confirmRemove() {
    const x = this.deleteTarget();
    if (!x || this.deleting()) return;
    this.deleting.set(true);
    this.api.remove(x.id).subscribe({
      next: () => {
        if (this.user()?.rol === 'ADMIN')
          this.notifyClient(
            x.usuarioId,
            'Movimiento eliminado por administración',
            `${x.tipo === 'DEPOSITO' ? 'Ingreso' : 'Retiro'} de $${Number(x.monto).toFixed(2)} · ${x.descripcion || 'Sin descripción'}`,
          );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.auth.refreshUser().subscribe({ error: () => {} });
        this.loadData(this.selectedUserId());
        this.notify('Movimiento eliminado');
      },
      error: (e) => {
        this.deleting.set(false);
        this.notify(e.error?.detail || 'No se pudo eliminar el movimiento');
      },
    });
  }
  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
  private loadData(usuarioId: number | null = null) {
    this.loading.set(true);
    forkJoin({
      movements: this.api.list(usuarioId),
      summary: this.api.summary(usuarioId),
    }).subscribe({
      next: (data) => {
        this.movements.set(data.movements);
        this.summary.set(data.summary);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify(e.error?.detail || 'No se pudo conectar con el backend');
      },
    });
  }
  private loadUsers() {
    this.api.users().subscribe({
      next: (users) => this.users.set(users),
      error: (e) => this.notify(e.error?.detail || 'No se pudieron cargar los clientes'),
    });
  }
  private loadTransfers(usuarioId: number | null = null) {
    this.transfersLoading.set(true);
    this.transfersError.set('');
    this.api.listarTransferencias(this.user()?.rol === 'ADMIN' ? usuarioId : null).subscribe({
      next: (items) => {
        this.transfers.set(items);
        this.transfersLoading.set(false);
      },
      error: (e) => {
        this.transfersLoading.set(false);
        this.transfersError.set(this.transferError(e));
      },
    });
  }
  private transferError(error: { status?: number; error?: { detail?: string } }) {
    if (error.error?.detail) return error.error.detail;
    if (error.status === 0)
      return 'No se pudo confirmar la respuesta. Puedes reintentar sin duplicar la transferencia.';
    if (error.status === 400)
      return 'Revisa los datos, el saldo disponible y la cuenta de destino.';
    if (error.status === 403) return 'No tienes autorización para realizar esta operación.';
    if (error.status === 404) return 'La cuenta o transferencia solicitada no existe.';
    if (error.status === 409) return 'La operación entró en conflicto. Intenta nuevamente.';
    if (error.status === 422)
      return 'Solo se permiten transferencias internas entre cuentas UnityBank.';
    return 'No se pudo realizar la transferencia.';
  }
  private notifyClient(userId: number, title: string, body: string) {
    this.messageService.sendTo(userId, title, body);
  }
  private notify(message: string) {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
