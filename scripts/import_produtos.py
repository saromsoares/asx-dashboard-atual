#!/usr/bin/env python3

import re
import os
import sys
import json

# Ler arquivo de produtos
with open('client/src/data/produtos.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extrair array de produtos
match = re.search(r'export const produtos: Produto\[\] = \[([\s\S]*?)\];', content)
if not match:
    print('❌ Não foi possível encontrar o array de produtos')
    sys.exit(1)

array_content = match.group(1)

# Remover comentários
array_content = re.sub(r'//.*$', '', array_content, flags=re.MULTILINE)

# Converter para JSON válido
# 1. Adicionar aspas em torno das chaves
array_content = re.sub(r'(\w+):', r'"\1":', array_content)

# 2. Remover vírgulas antes de } ou ]
array_content = re.sub(r',\s*([}\]])', r'\1', array_content)

# 3. Remover quebras de linha extras
array_content = re.sub(r'\n\s*\n', '\n', array_content)

# 4. Remover espaços em branco extras
array_content = re.sub(r'\s+', ' ', array_content)

# Fazer parse do JSON
try:
    json_str = '[' + array_content + ']'
    produtos = json.loads(json_str)
    print(f'✅ Encontrados {len(produtos)} produtos')
except json.JSONDecodeError as e:
    print(f'❌ Erro ao fazer parse do JSON: {e}')
    # Tentar um parse mais permissivo
    print('Tentando parse alternativo...')
    
    # Extrair objetos individuais
    produtos = []
    # Procurar por padrão {id: X, ... }
    for obj_match in re.finditer(r'\{[^{}]*id:\s*\d+[^{}]*\}', array_content):
        obj_str = obj_match.group(0)
        obj_str = re.sub(r'(\w+):', r'"\1":', obj_str)
        try:
            obj = json.loads(obj_str)
            produtos.append(obj)
        except:
            pass
    
    if not produtos:
        print('❌ Não foi possível fazer parse dos produtos')
        sys.exit(1)
    
    print(f'✅ Encontrados {len(produtos)} produtos (parse alternativo)')

# Gerar SQL
sql_lines = ['DELETE FROM produtos;']

for p in produtos:
    try:
        codigo = str(p.get('codigo', '')).replace("'", "''")
        descricao = str(p.get('descricao', '')).replace("'", "''")
        categoria = str(p.get('categoria', '')).replace("'", "''")
        ncm = str(p.get('ncm', '')).replace("'", "''")
        cod_barras = str(p.get('cod_barras', '')).replace("'", "''")
        unid = str(p.get('unid', 'UND')).replace("'", "''")
        caixa = str(p.get('caixa', 'PAR')).replace("'", "''")
        volt = str(p.get('volt', 'BIVOLT')).replace("'", "''")
        custo_usd = float(p.get('custo_usd', 0))
        preco_venda = float(p.get('preco_venda', 0))
        
        sql = f"""INSERT INTO produtos (codigo, descricao, categoria, unidade, caixa, voltagem, codigoBarras, ncm, custoUsd, precoVendaBrl, ativo) 
VALUES ('{codigo}', '{descricao}', '{categoria}', '{unid}', '{caixa}', '{volt}', '{cod_barras}', '{ncm}', {custo_usd}, {preco_venda}, 'true');"""
        
        sql_lines.append(sql)
    except Exception as e:
        print(f'⚠️  Erro ao processar produto {p.get("codigo")}: {e}')
        continue

# Salvar SQL
with open('/tmp/import_produtos.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f'✅ Arquivo SQL criado com {len(sql_lines)-1} INSERT statements')
print(f'📁 Arquivo: /tmp/import_produtos.sql')
print(f'📊 Tamanho: {os.path.getsize("/tmp/import_produtos.sql")} bytes')
