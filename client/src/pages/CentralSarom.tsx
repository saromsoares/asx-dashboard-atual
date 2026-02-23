/*
  Central de Compra — Sarom
  Instância do componente CentralCompra com dados independentes
  Cor de destaque: Vermelho ASX
*/

import CentralCompraAvancada from '@/components/CentralCompraAvancada';

export default function CentralSarom() {
  return (
    <CentralCompraAvancada
      comprador="sarom"
      titulo="CENTRAL DE COMPRA — SAROM"
      corAcento="oklch(0.48 0.22 25)"
    />
  );
}
