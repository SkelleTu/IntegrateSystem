# Aura System — Caixa: Especificação Forense de Operações

## Objetivo

Implementar as operações de caixa sem inventar estados, sem quebrar o fluxo do PDV e sem permitir que a interface apresente um saldo diferente do saldo calculado no servidor.

A regra central é: **o servidor é a fonte de verdade do dinheiro físico**. A interface apenas solicita operações e exibe o resultado calculado pelo servidor.

## Local da interface

Dentro do card/área de **Itens no Carrinho** do PDV deve existir um elemento visível chamado **Opções do Caixa**.

Ao abrir:

1. **Abertura de Caixa**
2. **Fechamento de Caixa**
3. **Sangria**
4. **Reposição**

A interface deve funcionar em desktop, notebook, tablet e telas estreitas, sem overflow horizontal, botões cortados ou modais que escapem da viewport.

## Regras de negócio

### Abertura de Caixa

- Pode existir somente um caixa aberto por operador.
- O valor inicial é armazenado em centavos.
- A abertura precisa ficar registrada como movimento auditável.
- Uma segunda abertura enquanto o caixa atual estiver aberto deve ser recusada pelo servidor.
- Depois de aberto, clicar em "Abertura de Caixa" não cria outro caixa. Deve mostrar que o turno atual já está aberto e exibir seu saldo inicial.

### Venda

Somente vendas efetivamente `completed` participam do dinheiro físico esperado.

- Dinheiro (`cash`) entra na gaveta.
- Cartão e Pix não entram no saldo físico da gaveta.
- Venda de simulação não pode alterar o dinheiro físico real.
- Venda cancelada não pode continuar aumentando o saldo esperado.

### Sangria

- Só pode ocorrer com caixa aberto.
- Valor deve ser maior que zero.
- Motivo é obrigatório.
- O servidor calcula o saldo disponível antes de aprovar.
- A sangria nunca pode deixar o saldo físico esperado negativo.
- A movimentação deve ser registrada individualmente com operador, caixa, valor, motivo e horário.
- A sangria reduz o saldo esperado.

### Reposição

- Só pode ocorrer com caixa aberto.
- Valor deve ser maior que zero.
- Motivo é obrigatório para auditoria.
- A movimentação deve ser registrada individualmente com operador, caixa, valor, motivo e horário.
- A reposição aumenta o saldo esperado.

### Fechamento de Caixa

O fechamento deve utilizar o mesmo cálculo do servidor usado para a tela e para validação da operação.

Saldo esperado da gaveta:

`abertura + vendas em dinheiro + reposições - sangrias + ajustes auditados`

O valor informado fisicamente pelo operador é comparado com esse saldo.

- O caixa só pode ser fechado uma vez.
- A atualização precisa ocorrer somente se o caixa ainda estiver aberto.
- O movimento de fechamento é registrado após o cálculo e após a confirmação do fechamento.
- O `difference` armazenado no caixa é `valor físico informado - valor esperado`.

## Auditoria

Criar uma tabela de movimentos específica para o caixa, sem tentar usar a tabela genérica de transações como substituta do livro de caixa.

Cada movimento deve conter, no mínimo:

- `id`
- `cashRegisterId`
- `userId`
- `type`
- `amount` em centavos
- `reason`
- `createdAt`

Tipos previstos:

- `opening`
- `replenishment`
- `withdrawal`
- `adjustment`
- `closing`

`adjustment` pode ser negativo e deve ser reservado para correções administrativas auditadas.

## Consistência

Não calcular saldo apenas no React.

A API deve fornecer um resumo único do caixa, contendo pelo menos:

- abertura
- vendas em dinheiro
- reposições
- sangrias
- ajustes
- saldo esperado
- últimos movimentos

A tela de fechamento deve usar esse mesmo resumo, e o endpoint de fechamento deve recalcular novamente no servidor antes de fechar.

## Concorrência e estados impossíveis

Tratar explicitamente:

- tentativa de abrir segundo caixa;
- tentativa de fechar caixa já fechado;
- sangria maior que o dinheiro disponível;
- valor não numérico, infinito, negativo ou vazio;
- falha de gravação;
- dupla submissão por clique repetido;
- resposta antiga de cache substituindo saldo novo;
- vendas simuladas contaminando saldo físico;
- vendas canceladas contaminando saldo físico;
- movimentação em caixa de outro operador;
- divergência entre o resumo visual e a validação de fechamento.

## Integração com os dois bancos

Toda alteração persistente deve continuar obedecendo à arquitetura atual de escrita simultânea Turso + SQLite local.

A nova tabela de movimentos precisa ser criada/migrada nos dois bancos.

Não adicionar um caminho de escrita que atualize apenas um banco.

## Critério de aceite manual

Testar, nesta ordem, como um operador real faria:

1. Abrir caixa com R$ 100,00.
2. Verificar que aparece no resumo como abertura.
3. Fazer venda de R$ 25,00 em dinheiro.
4. Conferir esperado = R$ 125,00.
5. Fazer sangria de R$ 20,00 com motivo.
6. Conferir esperado = R$ 105,00.
7. Fazer reposição de R$ 50,00 com motivo.
8. Conferir esperado = R$ 155,00.
9. Fazer venda de R$ 10,00 em cartão e confirmar que a gaveta continua em R$ 155,00.
10. Fechar informando R$ 155,00 e conferir diferença zero.
11. Tentar fechar novamente e confirmar recusa.
12. Tentar abrir novamente somente depois do fechamento.
13. Tentar sangria maior que o disponível e confirmar recusa.
14. Repetir os testes com valores decimais como R$ 0,01, R$ 10,50 e R$ 999,99.
15. Confirmar histórico e movimentos em ordem cronológica.

## Regra de qualidade

Nenhuma implementação deve ser considerada concluída apenas porque compila.

A análise precisa verificar o fluxo completo: **interface → API → regra de negócio → persistência → cálculo do saldo → retorno à interface → repetição/erro/concurrency → Turso + SQLite**.

Compilar é apenas a porta de entrada. O caixa precisa continuar fazendo sentido quando existe dinheiro físico em cima da bancada, porque aparentemente até sistemas de PDV precisam ser lembrados disso.
