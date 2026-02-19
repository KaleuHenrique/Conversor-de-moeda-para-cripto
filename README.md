# Conversor de Criptomoedas

Aplicação web simples para converter valores entre moeda fiat e criptomoedas em tempo real, usando a API da CoinGecko.

## Funcionalidades

- Conversão nos dois sentidos:
  - Moeda fiat -> cripto
  - Cripto -> moeda fiat
- Suporte a BRL, USD e EUR
- Busca de criptomoedas por nome ou símbolo
- Exibição de logo da cripto selecionada
- Histórico das últimas 5 conversões
- Persistência de preferências e histórico com `localStorage`
- Cache de preço por 15 segundos para reduzir chamadas à API
- Fallback offline com lista básica de criptos

## Tecnologias

- HTML5
- CSS3
- JavaScript (Vanilla)
- [CoinGecko API](https://www.coingecko.com/en/api)

## Como executar

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` no navegador.

Opcional: para evitar restrições de CORS em alguns ambientes, rode com um servidor local.

Exemplo com VS Code (Live Server):

1. Instale a extensão **Live Server**.
2. Clique com o botão direito em `index.html`.
3. Selecione **Open with Live Server**.

## Estrutura do projeto

- `index.html`: estrutura da interface
- `style.css`: estilos da aplicação
- `script.js`: lógica de conversão, integração com API, cache, preferências e histórico

## Armazenamento local

A aplicação salva dados no navegador com as chaves:

- `conversorPrefsV1`
- `conversorHistoryV1`

## Observações

- Os valores dependem da disponibilidade da API da CoinGecko.
- Em caso de falha de rede/API, a aplicação entra em modo offline com uma lista reduzida de criptomoedas.
