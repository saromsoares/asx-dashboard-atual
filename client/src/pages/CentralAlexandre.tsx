/*
  Central de Compra — Alexandre
  Instância do componente CentralCompra com dados independentes
  Cor de destaque: Azul para diferenciar do Sarom
*/

import CentralCompraAvancada from '@/components/CentralCompraAvancada';

export default function CentralAlexandre() {
  return (
    <CentralCompraAvancada
      comprador="alexandre"
      titulo="CENTRAL DE COMPRA — ALEXANDRE"
      corAcento="oklch(0.55 0.15 250)"
    />
  );
}
