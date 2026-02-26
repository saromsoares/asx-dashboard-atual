import { useEffect, useState } from 'react';
import { Users, User } from 'lucide-react';
import { useWebSocket } from '@/_core/hooks/useWebSocket';

export interface OnlineUser {
  userId: string;
  userName: string;
  email: string;
}

export function OnlineUsersIndicator() {
  const { getUsuariosConectados, on } = useWebSocket();
  const [usuarios, setUsuarios] = useState<OnlineUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Atualizar lista de usuários conectados
  useEffect(() => {
    const updateUsuarios = async () => {
      const conectados = await getUsuariosConectados();
      setUsuarios(conectados);
    };

    updateUsuarios();

    // Atualizar quando um usuário conecta ou desconecta
    const unsubscribeConectado = on('usuario_conectado', () => {
      updateUsuarios();
    });

    const unsubscribeDesconectado = on('usuario_desconectado', () => {
      updateUsuarios();
    });

    // Atualizar a cada 30 segundos
    const interval = setInterval(updateUsuarios, 30000);

    return () => {
      unsubscribeConectado();
      unsubscribeDesconectado();
      clearInterval(interval);
    };
  }, [getUsuariosConectados, on]);

  if (usuarios.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-80"
        style={{
          background: 'oklch(0.18 0.005 285)',
          borderColor: 'oklch(0.26 0.005 285)',
          color: 'oklch(0.70 0.010 285)',
        }}
        title={`${usuarios.length} usuário(s) online`}
      >
        <Users className="w-4 h-4" />
        <span className="text-xs font-medium">{usuarios.length}</span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 rounded-lg border shadow-lg z-50 min-w-max"
          style={{
            background: 'oklch(0.14 0.005 285)',
            borderColor: 'oklch(0.26 0.005 285)',
          }}
        >
          <div className="p-3 border-b" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>
              Usuários Online
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {usuarios.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-2 px-3 py-2 hover:bg-opacity-50 transition-colors"
                style={{
                  background: 'oklch(0.16 0.005 285)',
                  color: 'oklch(0.80 0.005 65)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'oklch(0.72 0.17 145)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user.userName}</p>
                  <p className="text-[10px] truncate" style={{ color: 'oklch(0.60 0.010 285)' }}>
                    {user.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente simplificado com apenas contagem
export function OnlineUsersBadge() {
  const { getUsuariosConectados, on } = useWebSocket();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const conectados = await getUsuariosConectados();
      setCount(conectados.length);
    };

    updateCount();

    const unsubscribeConectado = on('usuario_conectado', () => {
      updateCount();
    });

    const unsubscribeDesconectado = on('usuario_desconectado', () => {
      updateCount();
    });

    return () => {
      unsubscribeConectado();
      unsubscribeDesconectado();
    };
  }, [getUsuariosConectados, on]);

  if (count === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
      style={{
        background: 'oklch(0.48 0.22 145 / 0.2)',
        color: 'oklch(0.72 0.17 145)',
      }}
      title={`${count} usuário(s) online`}
    >
      <div className="w-2 h-2 rounded-full" style={{ background: 'oklch(0.72 0.17 145)' }} />
      <span>{count}</span>
    </div>
  );
}
