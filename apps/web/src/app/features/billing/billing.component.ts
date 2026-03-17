import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import {
  UiButton,
  UiCard,
  UiKpiCard,
  UiPageHeader,
  UiTable,
  UiBadge,
} from '../../ui';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    RouterModule,
    UiButton,
    UiCard,
    UiKpiCard,
    UiPageHeader,
    UiTable,
    UiBadge,
  ],
  template: `
    <div class="container-fluid">
      <app-ui-page-header
        title="Facturación"
        description="Resumen de uso y planes de NexDMS"
      >
        <div actions>
          <app-ui-button variant="primary" routerLink="/configuracion">
            Gestionar plan
          </app-ui-button>
        </div>
      </app-ui-page-header>

      <div class="row mb-4">
        <div class="col-md-4 mb-3">
          <app-ui-kpi-card
            label="Plan actual"
            value="Profesional"
            trend="+1 sucursal"
          />
        </div>
        <div class="col-md-4 mb-3">
          <app-ui-kpi-card
            label="Próximo cargo"
            value="$4,999 MXN"
            trend="Renovación 15 Abr"
          />
        </div>
        <div class="col-md-4 mb-3">
          <app-ui-kpi-card
            label="Uso este mes"
            value="78%"
            trend="+12% vs anterior"
          />
        </div>
      </div>

      <app-ui-card header="Historial de facturación" subtitle="Últimos cargos">
        <div headerActions>
          <app-ui-button variant="outline-secondary" size="sm">
            Descargar PDF
          </app-ui-button>
        </div>

        <app-ui-table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Monto</th>
              <th class="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>15 Mar 2025</td>
              <td>Plan Profesional — Marzo</td>
              <td>$4,999 MXN</td>
              <td class="text-center">
                <app-ui-badge variant="success">Pagado</app-ui-badge>
              </td>
            </tr>
            <tr>
              <td>15 Feb 2025</td>
              <td>Plan Profesional — Febrero</td>
              <td>$4,999 MXN</td>
              <td class="text-center">
                <app-ui-badge variant="success">Pagado</app-ui-badge>
              </td>
            </tr>
            <tr>
              <td>15 Ene 2025</td>
              <td>Plan Profesional — Enero</td>
              <td>$4,999 MXN</td>
              <td class="text-center">
                <app-ui-badge variant="success">Pagado</app-ui-badge>
              </td>
            </tr>
          </tbody>
        </app-ui-table>
      </app-ui-card>
    </div>
  `,
})
export class BillingComponent {}
