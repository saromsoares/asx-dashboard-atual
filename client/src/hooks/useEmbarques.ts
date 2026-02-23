import { useState, useCallback, useEffect } from 'react';

// Referência de um item de pedido embarcado em um contêiner
export interface ItemEmbarque {
  id: string; // ID único do embarque
  pedidoId: string; // ID do pedido de compra
  produtoId: number; // ID do produto
  qtdSaromEmbarque: number; // Quantidade Sarom embarcada neste contêiner
  qtdAlexandreEmbarque: number; // Quantidade Alexandre embarcada neste contêiner
  dataEmbarque: string;
}

// Registro de embarques por contêiner
export interface RegistroEmbarque {
  processoId: string; // ID do contêiner (ProcessoSR)
  embarques: ItemEmbarque[]; // Lista de itens embarcados neste contêiner
}

const STORAGE_KEY = 'asx_embarques';

export function useEmbarques() {
  const [embarques, setEmbarques] = useState<RegistroEmbarque[]>([]);
  const [carregado, setCarregado] = useState(false);

  // Carregar do localStorage
  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      try {
        setEmbarques(JSON.parse(salvo));
      } catch (e) {
        console.error('Erro ao carregar embarques:', e);
      }
    }
    setCarregado(true);
  }, []);

  // Salvar no localStorage
  const salvarEmbarques = useCallback((novos: RegistroEmbarque[]) => {
    setEmbarques(novos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novos));
  }, []);

  // Adicionar embarque de um item de pedido em um contêiner
  const adicionarEmbarque = useCallback(
    (
      processoId: string,
      pedidoId: string,
      produtoId: number,
      qtdSarom: number,
      qtdAlexandre: number
    ) => {
      const novoEmbarque: ItemEmbarque = {
        id: `embarque_${Date.now()}_${Math.random()}`,
        pedidoId,
        produtoId,
        qtdSaromEmbarque: qtdSarom,
        qtdAlexandreEmbarque: qtdAlexandre,
        dataEmbarque: new Date().toISOString(),
      };

      const registroExistente = embarques.find(r => r.processoId === processoId);
      if (registroExistente) {
        salvarEmbarques(
          embarques.map(r =>
            r.processoId === processoId
              ? { ...r, embarques: [...r.embarques, novoEmbarque] }
              : r
          )
        );
      } else {
        salvarEmbarques([
          ...embarques,
          { processoId, embarques: [novoEmbarque] },
        ]);
      }
    },
    [embarques, salvarEmbarques]
  );

  // Remover embarque
  const removerEmbarque = useCallback(
    (processoId: string, embarqueId: string) => {
      salvarEmbarques(
        embarques
          .map(r =>
            r.processoId === processoId
              ? {
                  ...r,
                  embarques: r.embarques.filter(e => e.id !== embarqueId),
                }
              : r
          )
          .filter(r => r.embarques.length > 0)
      );
    },
    [embarques, salvarEmbarques]
  );

  // Atualizar quantidade embarcada
  const atualizarEmbarque = useCallback(
    (
      processoId: string,
      embarqueId: string,
      qtdSarom: number,
      qtdAlexandre: number
    ) => {
      salvarEmbarques(
        embarques.map(r =>
          r.processoId === processoId
            ? {
                ...r,
                embarques: r.embarques.map(e =>
                  e.id === embarqueId
                    ? {
                        ...e,
                        qtdSaromEmbarque: qtdSarom,
                        qtdAlexandreEmbarque: qtdAlexandre,
                      }
                    : e
                ),
              }
            : r
        )
      );
    },
    [embarques, salvarEmbarques]
  );

  // Obter embarques de um contêiner
  const obterEmbarquesProcesso = useCallback(
    (processoId: string): ItemEmbarque[] => {
      const registro = embarques.find(r => r.processoId === processoId);
      return registro?.embarques || [];
    },
    [embarques]
  );

  // Obter total embarcado de um item de pedido
  const obterTotalEmbarque = useCallback(
    (pedidoId: string, produtoId: number) => {
      let totalSarom = 0;
      let totalAlexandre = 0;

      embarques.forEach(registro => {
        registro.embarques.forEach(item => {
          if (item.pedidoId === pedidoId && item.produtoId === produtoId) {
            totalSarom += item.qtdSaromEmbarque;
            totalAlexandre += item.qtdAlexandreEmbarque;
          }
        });
      });

      return { totalSarom, totalAlexandre };
    },
    [embarques]
  );

  // Limpar embarques de um contêiner (quando deletado)
  const limparEmbarquesProcesso = useCallback(
    (processoId: string) => {
      salvarEmbarques(embarques.filter(r => r.processoId !== processoId));
    },
    [embarques, salvarEmbarques]
  );

  return {
    embarques,
    carregado,
    adicionarEmbarque,
    removerEmbarque,
    atualizarEmbarque,
    obterEmbarquesProcesso,
    obterTotalEmbarque,
    limparEmbarquesProcesso,
  };
}
