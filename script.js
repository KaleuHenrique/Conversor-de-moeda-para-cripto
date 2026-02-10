document.addEventListener('DOMContentLoaded', () => {
  const selectCripto = document.getElementById('cripto');
  const selectFiat = document.getElementById('fiat');
  const valorInput = document.getElementById('valor');
  const resultadoEl = document.getElementById('resultado');
  const form = document.getElementById('formConverter');
  const criptoLogo = document.getElementById('criptoLogo');
  const historicoLista = document.getElementById('historicoLista');
  const ultimaAtualizacaoEl = document.getElementById('ultimaAtualizacao');
  const limparHistoricoBtn = document.getElementById('limparHistorico');

  let mapaCriptos = {};
  const historicoMax = 5;
  const cachePrecos = new Map();
  const cacheTTL = 15000; // 15s
  let debounceId;

  if (!selectCripto || !selectFiat || !valorInput || !resultadoEl || !form) {
    console.error('Elementos principais não encontrados no DOM.');
    return;
  }

  function setLoading(ativo) {
    const box = resultadoEl.closest('.resultado');
    if (!box) {
      return;
    }
    if (ativo) {
      box.classList.add('loading');
      resultadoEl.textContent = 'Carregando...';
    } else {
      box.classList.remove('loading');
    }
  }

  function atualizarLogo() {
    if (!criptoLogo) {
      return;
    }
    const cripto = mapaCriptos[selectCripto.value];
    if (!cripto || !cripto.image) {
      criptoLogo.classList.remove('is-visible');
      criptoLogo.removeAttribute('src');
      criptoLogo.alt = 'Logo da cripto';
      return;
    }

    criptoLogo.src = cripto.image;
    criptoLogo.alt = `Logo da ${cripto.name}`;
    criptoLogo.classList.add('is-visible');
  }

  function fetchComTimeout(url, ms) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal })
      .finally(() => clearTimeout(id));
  }

  function carregarFallback() {
    const fallback = [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' },
      { id: 'ethereum', name: 'Ethereum', symbol: 'eth' },
      { id: 'tether', name: 'Tether', symbol: 'usdt' }
    ];

    fallback.forEach((cripto, index) => {
      mapaCriptos[cripto.id] = cripto;
      const option = document.createElement('option');
      option.value = cripto.id;
      option.textContent = `${cripto.name} (${cripto.symbol.toUpperCase()})`;
      selectCripto.appendChild(option);

      if (index === 0) {
        selectCripto.value = cripto.id;
      }
    });

    if (resultadoEl.textContent === '---') {
      resultadoEl.textContent = 'Modo offline: lista básica carregada.';
    }
  }

  // Carregar Top 100 criptos por market cap
  async function carregarCriptos() {
    try {
      const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1';
      resultadoEl.textContent = 'Carregando criptos...';
      const res = await fetchComTimeout(url, 8000);
      if (!res.ok) {
        throw new Error('Resposta inválida da API.');
      }
      const criptos = await res.json();

      criptos.forEach((cripto, index) => {
        mapaCriptos[cripto.id] = {
          id: cripto.id,
          name: cripto.name,
          symbol: cripto.symbol,
          image: cripto.image
        };
        const option = document.createElement('option');
        option.value = cripto.id;
        option.textContent = `${cripto.name} (${cripto.symbol.toUpperCase()})`;
        selectCripto.appendChild(option);

        if (index === 0) {
          selectCripto.value = cripto.id;
          atualizarLogo();
          resultadoEl.textContent = '---';
        }
      });
    } catch (error) {
      resultadoEl.textContent = 'Erro ao carregar criptos.';
      console.error(error);
      carregarFallback();
    }
  }

  function adicionarHistorico(texto) {
    if (!historicoLista) {
      return;
    }
    const item = document.createElement('li');
    item.className = 'historico-item';
    const linha = document.createElement('div');
    linha.textContent = texto;
    const hora = document.createElement('div');
    hora.className = 'historico-time';
    hora.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    item.appendChild(linha);
    item.appendChild(hora);
    historicoLista.prepend(item);

    while (historicoLista.children.length > historicoMax) {
      historicoLista.removeChild(historicoLista.lastElementChild);
    }

    atualizarHistoricoVazio();
  }

  function atualizarHistoricoVazio() {
    if (!historicoLista) {
      return;
    }
    const vazioExistente = historicoLista.querySelector('.historico-vazio');
    if (historicoLista.children.length === 0) {
      const vazio = document.createElement('li');
      vazio.className = 'historico-vazio';
      vazio.textContent = 'Sem histórico ainda.';
      historicoLista.appendChild(vazio);
      return;
    }
    if (vazioExistente && historicoLista.children.length > 1) {
      vazioExistente.remove();
    }
  }

  function setUltimaAtualizacao() {
    if (!ultimaAtualizacaoEl) {
      return;
    }
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    ultimaAtualizacaoEl.textContent = `Atualizado às ${hora}`;
  }

  function getCacheKey(criptoId, fiat) {
    return `${criptoId}-${fiat}`;
  }

  async function obterPreco(criptoId, fiat) {
    const key = getCacheKey(criptoId, fiat);
    const agora = Date.now();
    const cache = cachePrecos.get(key);

    if (cache && (agora - cache.timestamp) < cacheTTL) {
      return cache.preco;
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${criptoId}&vs_currencies=${fiat}`;
    const res = await fetchComTimeout(url, 8000);
    if (!res.ok) {
      throw new Error('Falha ao obter preço.');
    }
    const dados = await res.json();
    const preco = dados?.[criptoId]?.[fiat];

    if (!preco) {
      throw new Error('Preço indisponível.');
    }

    cachePrecos.set(key, { preco, timestamp: agora });
    return preco;
  }

  // Função de conversão
  async function converter(opcoes = {}) {
    const valor = Number(valorInput.value);
    const fiat = selectFiat.value;
    const criptoId = selectCripto.value;

    if (!valor || !criptoId) {
      resultadoEl.textContent = 'Preencha todos os campos.';
      return;
    }

    try {
      setLoading(true);
      const cripto = mapaCriptos[criptoId];
      const preco = await obterPreco(criptoId, fiat);
      const total = valor / preco;
      const texto = `${valor.toLocaleString('pt-BR')} ${fiat.toUpperCase()} = ${total.toFixed(8)} ${cripto.symbol.toUpperCase()} (${cripto.name})`;
      resultadoEl.textContent = texto;
      setUltimaAtualizacao();
      if (opcoes.pushHistorico) {
        adicionarHistorico(texto);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        resultadoEl.textContent = 'Tempo esgotado ao consultar a API.';
      } else {
        resultadoEl.textContent = 'Sem conexão ou API indisponível.';
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function converterComDebounce() {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => converter(), 400);
  }

  // ENTER ou botão
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    converter({ pushHistorico: true });
  });

  selectCripto.addEventListener('change', atualizarLogo);
  selectCripto.addEventListener('change', converter);
  selectFiat.addEventListener('change', converter);
  valorInput.addEventListener('input', converterComDebounce);

  if (limparHistoricoBtn && historicoLista) {
    limparHistoricoBtn.addEventListener('click', () => {
      historicoLista.innerHTML = '';
      atualizarHistoricoVazio();
    });
  }

  // Inicializar
  carregarCriptos();
  atualizarHistoricoVazio();
});
