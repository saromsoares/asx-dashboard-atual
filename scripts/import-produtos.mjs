#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para converter TypeScript para JSON válido
function convertTsToJson(tsContent) {
  // Remover comentários de linha
  let json = tsContent.replace(/\/\/.*$/gm, '');
  
  // Remover quebras de linha extras
  json = json.replace(/\n\s*\n/g, '\n');
  
  // Converter propriedades sem aspas para com aspas
  // Ex: id: 1 -> "id": 1
  json = json.replace(/(\w+):/g, '"$1":');
  
  // Remover vírgulas antes de } ou ]
  json = json.replace(/,\s*([}\]])/g, '$1');
  
  return json;
}

async function importProdutos() {
  let connection;
  try {
    // Ler arquivo de produtos
    const produtosPath = path.join(__dirname, '../client/src/data/produtos.ts');
    let produtosContent = fs.readFileSync(produtosPath, 'utf-8');

    // Extrair apenas o array de produtos
    let arrayStart = produtosContent.indexOf('export const produtos: Produto[] = [');
    let arrayEnd = produtosContent.lastIndexOf('];');
    
    if (arrayStart === -1 || arrayEnd === -1) {
      console.error('❌ Não foi possível encontrar o array de produtos');
      process.exit(1);
    }

    // Extrair o conteúdo do array
    let arrayContent = produtosContent.substring(arrayStart + 'export const produtos: Produto[] = '.length, arrayEnd + 1);

    // Converter TypeScript para JSON válido
    let jsonContent = convertTsToJson(arrayContent);

    // Fazer parse do JSON
    let produtos = [];
    try {
      produtos = JSON.parse(jsonContent);
    } catch (e) {
      console.error('❌ Erro ao fazer parse do JSON:', e.message);
      // Mostrar um trecho do JSON para debug
      console.error('Conteúdo convertido (primeiros 500 chars):', jsonContent.substring(0, 500));
      process.exit(1);
    }

    console.log(`✅ Encontrados ${produtos.length} produtos para importar`);

    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
    });

    console.log('✅ Conectado ao banco de dados');

    // Limpar tabela de produtos existentes
    await connection.execute('DELETE FROM produtos');
    console.log('🗑️  Tabela de produtos limpa');

    // Preparar insert
    let importedCount = 0;
    let errorCount = 0;

    for (const produto of produtos) {
      try {
        await connection.execute(
          `INSERT INTO produtos (
            codigo, descricao, categoria, unidade, caixa, voltagem,
            codigoBarras, ncm, custoUsd, precoVendaBrl, ativo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            produto.codigo,
            produto.descricao,
            produto.categoria,
            produto.unid || 'UND',
            produto.caixa || 'PAR',
            produto.volt || 'BIVOLT',
            produto.cod_barras || null,
            produto.ncm || null,
            parseFloat(produto.custo_usd) || 0,
            parseFloat(produto.preco_venda) || 0,
            'true',
          ]
        );
        importedCount++;
      } catch (error) {
        console.error(`❌ Erro ao importar produto ${produto.codigo}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Resultado da importação:`);
    console.log(`✅ Importados: ${importedCount} produtos`);
    console.log(`❌ Erros: ${errorCount} produtos`);

    // Verificar contagem final
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM produtos');
    console.log(`📈 Total de produtos no banco: ${rows[0].count}`);

    await connection.end();
    console.log('\n✅ Importação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante importação:', error);
    process.exit(1);
  }
}

// Executar importação
importProdutos();
