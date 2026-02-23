import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';

interface ImageUploadButtonProps {
  productId: number;
  onImageChange?: (imageUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  showPreview?: boolean;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  productId,
  onImageChange,
  size = 'md',
  showPreview = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { getImage, saveImage, removeImage } = useImageUpload();

  // Carregar imagem ao montar
  useEffect(() => {
    const img = getImage(productId);
    setImageUrl(img);
  }, [productId, getImage]);

  // Ouvir eventos de atualização de imagem
  useEffect(() => {
    const handleImageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.productId === productId) {
        setImageUrl(customEvent.detail.imageUrl);
        onImageChange?.(customEvent.detail.imageUrl);
      }
    };

    window.addEventListener('imageUpdated', handleImageUpdate);
    return () => window.removeEventListener('imageUpdated', handleImageUpdate);
  }, [productId, onImageChange]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await saveImage(productId, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeImage(productId);
    setImageUrl(null);
    onImageChange?.(null);
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs px-2 py-1',
    md: 'w-8 h-8 text-sm px-3 py-1.5',
    lg: 'w-10 h-10 text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={loading}
      />

      {showPreview && imageUrl ? (
        <div className="relative group">
          <img
            src={imageUrl}
            alt="Preview"
            className={`${sizeClasses[size]} rounded object-cover cursor-pointer`}
            onClick={() => fileInputRef.current?.click()}
          />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remover imagem"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : null}

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className={`${sizeClasses[size]} flex items-center gap-1 rounded-md transition-colors ${
          loading
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        } text-white font-medium`}
        title={imageUrl ? 'Alterar imagem' : 'Fazer upload de imagem'}
      >
        {loading ? (
          <div className="animate-spin">
            <Upload className={iconSizes[size]} />
          </div>
        ) : imageUrl ? (
          <ImageIcon className={iconSizes[size]} />
        ) : (
          <Upload className={iconSizes[size]} />
        )}
      </button>

      {error && (
        <span className="text-xs text-red-500" title={error}>
          ⚠️
        </span>
      )}
    </div>
  );
};
