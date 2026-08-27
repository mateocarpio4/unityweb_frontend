import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MovementService } from './movimientos';
import { TransferenciaRequest, TransferenciaResponse } from '../service/bank.models';
import { environment } from '../../environments/environment';

describe('MovementService transfers', () => {
  let service: MovementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MovementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the real transfer endpoint and preserves the idempotency key', () => {
    const request: TransferenciaRequest = {
      numeroCuentaDestino: '123456789012',
      monto: 25.5,
      concepto: 'Pago mensual',
      idempotencyKey: '3a469160-7dd4-4aef-9cf7-c042b2368d31',
      banco: 'UnityBank',
    };
    service.transferir(request).subscribe();
    const call = http.expectOne(`${environment.apiUrl}/movimientos/transferencias`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({});
  });

  it('loads and sorts the official transfer history', () => {
    let result: TransferenciaResponse[] = [];
    service.listarTransferencias().subscribe((items) => (result = items));
    const call = http.expectOne(`${environment.apiUrl}/transferencias`);
    call.flush([
      { referencia: 'A', fecha: '2026-01-01T00:00:00Z' },
      { referencia: 'B', fecha: '2026-02-01T00:00:00Z' },
    ]);
    expect(result.map((item) => item.referencia)).toEqual(['B', 'A']);
  });

  it('loads an official receipt by reference', () => {
    service
      .obtenerTransferencia('TRF-1')
      .subscribe((receipt) => expect(receipt.referencia).toBe('TRF-1'));
    const call = http.expectOne(`${environment.apiUrl}/transferencias/TRF-1`);
    call.flush({ referencia: 'TRF-1' });
  });
});
