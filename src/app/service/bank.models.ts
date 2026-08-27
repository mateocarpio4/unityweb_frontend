export type MovementType = 'DEPOSITO' | 'RETIRO';
export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'CLIENTE';
  saldo: number;
  numeroCuenta: string;
}
export interface AuthResponse {
  token: string;
  usuario: User;
}
export interface Movement {
  id: number;
  tipo: MovementType;
  monto: number;
  fecha: string;
  descripcion: string | null;
  usuarioId: number;
  usuarioNombre: string;
  referenciaTransferencia?: string | null;
  origenMovimiento?: 'MANUAL' | 'TRANSFERENCIA';
}
export interface MovementPayload {
  tipo: MovementType;
  monto: number;
  descripcion: string;
  usuarioId?: number | null;
}
export interface Summary {
  cantidadDepositos: number;
  totalDepositos: number;
  cantidadRetiros: number;
  totalRetiros: number;
  balanceMovimientos: number;
}
export interface AccountPayload {
  nombre: string;
  email: string;
  contrasena: string;
  rol: 'CLIENTE' | 'ADMIN';
}
export interface TransferenciaRequest {
  numeroCuentaDestino: string;
  monto: number;
  concepto?: string;
  idempotencyKey: string;
  banco?: 'UnityBank';
}
export interface TransferenciaResponse {
  id: number;
  referencia: string;
  titularOrigen: string;
  destinatario: string;
  numeroCuentaDestino: string;
  monto: number;
  concepto: string | null;
  fecha: string;
  estado: 'COMPLETADA' | 'RECHAZADA';
  saldoDisponible: number;
}
