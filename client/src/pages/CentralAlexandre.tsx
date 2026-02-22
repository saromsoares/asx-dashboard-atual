/*
  Central de Compra — Alexandre
  Instância do componente CentralCompra com dados independentes
  Cor de destaque: Azul para diferenciar do Sarom
*/

import CentralCompra from '@/components/CentralCompra';

export default function CentralAlexandre() {
  return (
    <CentralCompra
      comprador="alexandre"
      titulo="CENTRAL DE COMPRA — ALEXANDRE"
      corAcento="oklch(0.55 0.15 250)"
      corAcentoHover="oklch(0.62 0.15 250)"
    />
  );
}
