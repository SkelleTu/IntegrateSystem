# Aura

Sistema de gestão para barbearias e estabelecimentos multi-serviços.

## Mudanças Recentes
- Remoção do modal de login inicial obrigatório.
- Atualização da interface de login para um design mais limpo e moderno.
- Ajuste na navegação para permitir visualização da Home sem autenticação prévia (funcionalidades protegidas continuam exigindo login).
- Refinamento visual da Landing Page: Remoção de efeitos de pulsação (flashing) e adição de um glow estático artístico deslocado para a esquerda da logo principal para um visual mais profissional.
- Correção na lógica de biometria: Retornamos o uso da API WebAuthn real para garantir que o sensor do dispositivo seja ativado no cadastro e na marcação de ponto, vinculando o ID único gerado ao banco de dados.
