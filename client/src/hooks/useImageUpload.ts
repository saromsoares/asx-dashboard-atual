import { useCallback, useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

interface ImageData {
  [productId: number]: string; // base64 data URL
}

const CONFIG_KEY = 'asx_product_images';

export function useImageUpload() {
  const [images, setImages] = useState<ImageData>({});
  const { data: configDB } = trpc.dados.getConfig.useQuery({ chave: CONFIG_KEY });
  const setConfigMut = trpc.dados.setConfig.useMutation();
  const utils = trpc.useUtils();
  const dbLoaded = useRef(false);

  // Carregar imagens do banco de dados
  useEffect(() => {
    if (configDB && configDB.dados && !dbLoaded.current) {
      try {
        const parsed = JSON.parse(configDB.dados);
        setImages(parsed);
        dbLoaded.current = true;
      } catch (error) {
        console.error('Erro ao carregar imagens do banco:', error);
      }
    }
  }, [configDB]);

  // Persistir imagens no banco
  const persistImages = useCallback((newImages: ImageData) => {
    setConfigMut.mutate({ chave: CONFIG_KEY, dados: JSON.stringify(newImages) }, {
      onSuccess: () => utils.dados.getConfig.invalidate({ chave: CONFIG_KEY }),
    });
  }, [setConfigMut, utils]);

  // Carregar imagens (retorna estado atual)
  const loadImages = useCallback((): ImageData => {
    return images;
  }, [images]);

  // Obter imagem de um produto específico
  const getImage = useCallback((productId: number): string | null => {
    return images[productId] || null;
  }, [images]);

  // Salvar imagem de um produto
  const saveImage = useCallback((productId: number, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const newImages = { ...images, [productId]: reader.result as string };
          setImages(newImages);
          persistImages(newImages);
          
          // Disparar evento customizado para atualizar UI
          window.dispatchEvent(new CustomEvent('imageUpdated', { 
            detail: { productId, imageUrl: reader.result } 
          }));
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo'));
      };
      
      // Limitar tamanho a 2MB
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error('Arquivo muito grande (máx. 2MB)'));
        return;
      }
      
      reader.readAsDataURL(file);
    });
  }, [images, persistImages]);

  // Remover imagem de um produto
  const removeImage = useCallback((productId: number): void => {
    try {
      const newImages = { ...images };
      delete newImages[productId];
      setImages(newImages);
      persistImages(newImages);
      
      window.dispatchEvent(new CustomEvent('imageUpdated', { 
        detail: { productId, imageUrl: null } 
      }));
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
    }
  }, [images, persistImages]);

  // Exportar todas as imagens (para backup)
  const exportImages = useCallback((): string => {
    return JSON.stringify(images);
  }, [images]);

  // Importar imagens (para restauração)
  const importImages = useCallback((data: string): void => {
    try {
      const parsed = JSON.parse(data);
      setImages(parsed);
      persistImages(parsed);
      window.dispatchEvent(new CustomEvent('imagesImported'));
    } catch (error) {
      console.error('Erro ao importar imagens:', error);
      throw error;
    }
  }, [persistImages]);

  return {
    getImage,
    saveImage,
    removeImage,
    loadImages,
    exportImages,
    importImages,
  };
}
