# 🔒 Política de Segurança - ASX Dashboard

## 1. Backups Automáticos

### Configuração Manus
- **Frequência**: Diária (automático)
- **Retenção**: 30 dias
- **Local**: Infraestrutura Manus (redundância geográfica)
- **Acesso**: Dashboard → Database → Backups

### Procedimento de Restauração
1. Acessar painel de controle Manus
2. Ir para Database → Backups
3. Selecionar data desejada
4. Clicar em "Restore"
5. Confirmar operação

### Backup Manual (Fallback)
```bash
# Exportar banco de dados
mysqldump -h [host] -u [user] -p [database] > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar banco de dados
mysql -h [host] -u [user] -p [database] < backup_file.sql
```

---

## 2. Versionamento de Código

### Git + Manus Integration
- **Repositório**: Sincronizado automaticamente com Manus
- **Branch Principal**: `main`
- **Commits**: Cada mudança é rastreada
- **Histórico**: Disponível em `git log`

### Workflow Recomendado
```bash
# Criar branch para feature
git checkout -b feature/nome-da-feature

# Fazer commits
git add .
git commit -m "Descrição clara da mudança"

# Fazer push
git push origin feature/nome-da-feature

# Criar Pull Request no Manus
```

### Recuperação de Código
```bash
# Ver histórico
git log --oneline

# Reverter para commit anterior
git revert [commit-hash]

# Restaurar arquivo deletado
git checkout [commit-hash] -- [arquivo]
```

---

## 3. Logs de Auditoria

### Tabela de Auditoria
Localização: `auditLogs` no banco de dados

**Campos Registrados:**
- `userId`: ID do usuário que fez a ação
- `acao`: Tipo de ação (criou, atualizou, deletou, alterou_status)
- `entidade`: Tipo de registro afetado (pedido, item_pedido, estoque)
- `entidadeId`: ID do registro afetado
- `dadosAntigos`: JSON com dados anteriores
- `dadosNovos`: JSON com novos dados
- `descricao`: Descrição legível da ação
- `ipAddress`: IP do cliente
- `userAgent`: Navegador/cliente
- `criadoEm`: Timestamp da ação

### Ações Rastreadas

#### Pedidos
- ✅ **Criação**: Registra nome e status inicial
- ✅ **Alteração de Status**: Registra status anterior e novo
- ✅ **Deleção**: Registra dados completos do pedido deletado

#### Estoques (Futuro)
- Criação/Atualização de quantidade
- Mudanças de preço

#### Preços (Futuro)
- Alterações de custo USD
- Alterações de preço de venda BRL

### Consultar Logs
```sql
-- Todos os logs de um usuário
SELECT * FROM auditLogs WHERE userId = 1 ORDER BY criadoEm DESC;

-- Logs de um pedido específico
SELECT * FROM auditLogs WHERE entidade = 'pedido' AND entidadeId = '123';

-- Logs dos últimos 7 dias
SELECT * FROM auditLogs WHERE criadoEm >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Deletações
SELECT * FROM auditLogs WHERE acao = 'deletou';
```

---

## 4. Segurança de Dados

### Proteção de Informações Sensíveis
- ✅ **Preços de Custo**: Apenas usuários autenticados podem ver
- ✅ **Dados de Pedidos**: Rastreados em logs de auditoria
- ✅ **Senhas**: Gerenciadas via OAuth Manus (nunca armazenadas)

### Autenticação
- **Método**: OAuth 2.0 (Manus)
- **Sessão**: Cookie seguro com HttpOnly
- **Expiração**: 24 horas de inatividade

### Autorização
- **Roles**: `user` (padrão) e `admin`
- **Procedures Protegidas**: Todas as mutações requerem autenticação
- **Queries Públicas**: Nenhuma (todas requerem autenticação)

---

## 5. Checklist de Segurança

- [x] Backups automáticos configurados
- [x] Git versionamento ativo
- [x] Logs de auditoria implementados
- [x] Autenticação OAuth integrada
- [x] HTTPS/SSL ativo
- [ ] Criptografia de dados sensíveis (TODO)
- [ ] 2FA para admins (TODO)
- [ ] Rate limiting em APIs (TODO)
- [ ] Alertas de atividades suspeitas (TODO)

---

## 6. Contato e Suporte

**Problemas de Segurança?**
- Contatar: security@asxstore.com
- Manus Support: https://help.manus.im

**Últimas Atualizações:**
- 2026-02-24: Implementação de backups, versionamento e logs de auditoria
