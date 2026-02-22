/*
  Central de Compra — Sarom
  Instância do componente CentralCompra com dados independentes
  Cor de destaque: Vermelho ASX
*/

import CentralCompra from '@/components/CentralCompra';

export default function CentralSarom() {
  return (
    <CentralCompra
      comprador="sarom"
      titulo="CENTRAL DE COMPRA — SAROM"
      corAcento="oklch(0.48 0.22 25)"
      corAcentoHover="oklch(0.55 0.22 25)"
    />
  );
}
