# Aura

Sistema de gestão para barbearias e estabelecimentos multi-serviços.

## Mudanças Recentes
- Remoção do modal de login inicial obrigatório.
- Atualização da interface de login para um design mais limpo e moderno.
- Ajuste na navegação para permitir visualização da Home sem autenticação prévia (funcionalidades protegidas continuam exigindo login).
- Correção na lógica de biometria: Retornamos o uso da API WebAuthn real para garantir que o sensor do dispositivo seja ativado no cadastro e na marcação de ponto, vinculando o ID único gerado ao banco de dados.
- **Funcionalidade de REPOSIÇÃO de estoque**: Agora é possível clicar em "Repor" em qualquer produto do estoque para adicionar mais unidades sem conflitos de ID. A reposição permite especificar: quantidade de embalagens, tipo de embalagem, unidades por embalagem, custo e nova validade. A quantidade é adicionada ao estoque existente.
- **Histórico de reposições expandível**: Cada item do estoque pode ser clicado para expandir e ver todas as reposições individuais com data/hora, quantidade, custo e validade.
- **Indicadores de urgência de validade**: Sistema visual de cores para alertar sobre produtos próximos do vencimento:
  - **Vermelho (URGENTE)**: Vence em 3 dias ou menos
  - **Amarelo (ATENÇÃO)**: Vence em 7 dias ou menos
  - **Azul (EM BREVE)**: Vence em 14 dias ou menos
  - Borda colorida na linha principal + badges individuais nas reposições expandidas
