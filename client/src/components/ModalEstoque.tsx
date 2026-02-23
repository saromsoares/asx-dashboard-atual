import { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ModalEstoqueProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveManual: (codigo: string, quantidade: number) => void;
  onImportExcel: (dados: Array<{ codigo: string; quantidade: number }>) => void;
}

export default function ModalEstoque({ isOpen, onClose, onSaveManual, onImportExcel }: ModalEstoqueProps) {
  const [modo, setModo] = useState<'manual' | 'importar'>('manual');
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveManual = () => {
    if (codigo.trim() && quantidade) {
      onSaveManual(codigo.trim(), parseInt(quantidade));
      setCodigo('');
      setQuantidade('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const dados = jsonData
          .map((row: any) => ({
            codigo: String(row['COD'] || row['Código'] || row['codigo'] || '').trim(),
            quantidade: parseInt(row['ESTOQUE'] || row['Estoque'] || row['estoque'] || '0'),
          }))
          .filter(d => d.codigo && d.quantidade > 0);

        if (dados.length > 0) {
          onImportExcel(dados);
          onClose();
        } else {
          alert('Nenhum dado válido encontrado na planilha');
        }
      } catch (error) {
        alert('Erro ao ler arquivo Excel: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      { 'COD': 'ASX1001', 'DESCRIÇÃO': 'ULTRA LED CSP H1 - 70W', 'ESTOQUE': 100 },
      { 'COD': 'ASX1003', 'DESCRIÇÃO': 'ULTRA LED CSP H3 - 70W', 'ESTOQUE': 50 },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
    XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_estoque.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4" style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'oklch(0.32 0.005 285)' }}>
          <h2 className="font-rajdhani font-bold text-xl">Adicionar Estoque</h2>
          <button onClick={onClose} className="p-1 hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b" style={{ borderColor: 'oklch(0.32 0.005 285)' }}>
          <button
            onClick={() => setModo('manual')}
            className="flex-1 px-4 py-3 text-sm font-semibold transition-colors"
            style={{
              background: modo === 'manual' ? 'oklch(0.22 0.005 285)' : 'transparent',
              color: modo === 'manual' ? 'oklch(0.80 0.005 65)' : 'oklch(0.50 0.010 285)',
              borderBottom: modo === 'manual' ? '2px solid oklch(0.48 0.22 25)' : 'none',
            }}
          >
            Manual
          </button>
          <button
            onClick={() => setModo('importar')}
            className="flex-1 px-4 py-3 text-sm font-semibold transition-colors"
            style={{
              background: modo === 'importar' ? 'oklch(0.22 0.005 285)' : 'transparent',
              color: modo === 'importar' ? 'oklch(0.80 0.005 65)' : 'oklch(0.50 0.010 285)',
              borderBottom: modo === 'importar' ? '2px solid oklch(0.60 0.18 85)' : 'none',
            }}
          >
            Importar Excel
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {modo === 'manual' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Código do Produto
                </label>
                <input
                  type="text"
                  placeholder="ASX1001"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{
                    background: 'oklch(0.22 0.005 285)',
                    borderColor: 'oklch(0.32 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Quantidade
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{
                    background: 'oklch(0.22 0.005 285)',
                    borderColor: 'oklch(0.32 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>
              <button
                onClick={handleSaveManual}
                className="w-full px-4 py-2 rounded-md font-semibold transition-colors"
                style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
              >
                Adicionar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: 'oklch(0.32 0.005 285)' }}>
                <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'oklch(0.60 0.18 85)' }} />
                <p className="text-sm font-semibold mb-2">Selecione um arquivo Excel</p>
                <p className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Colunas: COD, ESTOQUE
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 rounded-md font-semibold transition-colors"
                  style={{ background: 'oklch(0.60 0.18 85)', color: 'white' }}
                >
                  Escolher Arquivo
                </button>
              </div>
              <button
                onClick={downloadTemplate}
                className="w-full px-4 py-2 rounded-md font-semibold transition-colors"
                style={{ background: 'oklch(0.22 0.005 285)', color: 'oklch(0.80 0.005 65)', border: '1px solid oklch(0.32 0.005 285)' }}
              >
                Baixar Template
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 border-t" style={{ borderColor: 'oklch(0.32 0.005 285)' }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-md font-semibold transition-colors"
            style={{ background: 'oklch(0.22 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
