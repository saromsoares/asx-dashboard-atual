import { useCallback } from 'react';

interface ImageData {
  [productId: number]: string; // base64 data URL
}

const STORAGE_KEY = 'asx_product_images';

export function useImageUpload() {
  // Carregar imagens do localStorage
  const loadImages = useCallback((): ImageData => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      return {};
    }
  }, []);

  // Obter imagem de um produto específico
  const getImage = useCallback((productId: number): string | null => {
    const images = loadImages();
    return images[productId] || null;
  }, [loadImages]);

  // Salvar imagem de um produto
  const saveImage = useCallback((productId: number, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const images = loadImages();
          images[productId] = reader.result as string;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
          
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
  }, [loadImages]);

  // Remover imagem de um produto
  const removeImage = useCallback((productId: number): void => {
    try {
      const images = loadImages();
      delete images[productId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
      
      window.dispatchEvent(new CustomEvent('imageUpdated', { 
        detail: { productId, imageUrl: null } 
      }));
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
    }
  }, [loadImages]);

  // Exportar todas as imagens (para backup)
  const exportImages = useCallback((): string => {
    const images = loadImages();
    return JSON.stringify(images);
  }, [loadImages]);

  // Importar imagens (para restauração)
  const importImages = useCallback((data: string): void => {
    try {
      const images = JSON.parse(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
      window.dispatchEvent(new CustomEvent('imagesImported'));
    } catch (error) {
      console.error('Erro ao importar imagens:', error);
      throw error;
    }
  }, []);

  return {
    getImage,
    saveImage,
    removeImage,
    loadImages,
    exportImages,
    importImages,
  };
}
