# Barber-Flow

Sistema de gestão para barbearias e estabelecimentos multi-serviços.

## Mudanças Recentes
- Remoção do modal de login inicial obrigatório.
- Atualização da interface de login para um design mais limpo e moderno.
- Ajuste na navegação para permitir visualização da Home sem autenticação prévia (funcionalidades protegidas continuam exigindo login).
- Correção na lógica de biometria: agora o sistema utiliza um ID determinístico vinculado ao usuário para garantir que o banco de dados seja a única fonte de verdade, resolvendo problemas de "perda" de cadastro biométrico em ambientes de desenvolvimento.
