import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AccountPayload,
  Movement,
  MovementPayload,
  Summary,
  TransferenciaRequest,
  TransferenciaResponse,
  User,
} from '../service/bank.models';
@Injectable({ providedIn: 'root' })
export class MovementService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  list(usuarioId?: number | null) {
    const url = usuarioId
      ? `${this.api}/movimientos?usuarioId=${usuarioId}`
      : `${this.api}/movimientos`;
    return this.http
      .get<Movement[]>(url)
      .pipe(map((x) => x.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))));
  }
  users() {
    return this.http.get<User[]>(`${this.api}/usuarios`);
  }
  summary(usuarioId?: number | null) {
    const url = usuarioId
      ? `${this.api}/reportes/resumen?usuarioId=${usuarioId}`
      : `${this.api}/reportes/resumen`;
    return this.http.get<Summary>(url);
  }
  createAccount(payload: AccountPayload) {
    return this.http.post<User>(`${this.api}/usuarios`, payload);
  }
  create(p: MovementPayload): Observable<Movement> {
    return this.http.post<Movement>(`${this.api}/movimientos`, p);
  }
  update(id: number, p: MovementPayload): Observable<Movement> {
    return this.http.put<Movement>(`${this.api}/movimientos/${id}`, p);
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/movimientos/${id}`);
  }
  transferir(request: TransferenciaRequest): Observable<TransferenciaResponse> {
    return this.http.post<TransferenciaResponse>(`${this.api}/movimientos/transferencias`, request);
  }
  listarTransferencias(usuarioId?: number | null): Observable<TransferenciaResponse[]> {
    const url = usuarioId
      ? `${this.api}/transferencias?usuarioId=${usuarioId}`
      : `${this.api}/transferencias`;
    return this.http
      .get<TransferenciaResponse[]>(url)
      .pipe(map((items) => items.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))));
  }
  obtenerTransferencia(referencia: string): Observable<TransferenciaResponse> {
    return this.http.get<TransferenciaResponse>(
      `${this.api}/transferencias/${encodeURIComponent(referencia)}`,
    );
  }
}
