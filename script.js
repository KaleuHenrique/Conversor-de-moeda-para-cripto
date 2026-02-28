<<<<<<< HEAD
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
  const buscaCriptoInput = document.getElementById('buscaCripto');
  const inverterConversaoBtn = document.getElementById('inverterConversao');
  const tituloConversaoEl = document.getElementById('tituloConversao');
  const labelValorEl = document.getElementById('labelValor');
  const labelFiatEl = document.getElementById('labelFiat');
  const labelCriptoEl = document.getElementById('labelCripto');

  let mapaCriptos = {};
  let listaCriptos = [];
  const historicoMax = 5;
  const cachePrecos = new Map();
  const cacheTTL = 15000;
  let debounceId;
  let historicoDados = [];
  let modoConversao = 'fiat-para-cripto';

  const STORAGE_PREFS_KEY = 'conversorPrefsV1';
  const STORAGE_HISTORY_KEY = 'conversorHistoryV1';

  if (!selectCripto || !selectFiat || !valorInput || !resultadoEl || !form) {
    console.error('Elementos principais não encontrados no DOM.');
    return;
  }

  function carregarJsonStorage(key, fallback) {
    try {
      const bruto = localStorage.getItem(key);
      if (!bruto) {
        return fallback;
      }
      return JSON.parse(bruto);
    } catch (error) {
      console.error('Erro ao ler localStorage:', error);
      return fallback;
    }
  }

  function salvarJsonStorage(key, valor) {
    try {
      localStorage.setItem(key, JSON.stringify(valor));
    } catch (error) {
      console.error('Erro ao salvar localStorage:', error);
    }
  }

  function carregarPreferencias() {
    return carregarJsonStorage(STORAGE_PREFS_KEY, {});
  }

  function salvarPreferencias() {
    const preferencias = {
      fiat: selectFiat.value,
      cripto: selectCripto.value,
      valor: valorInput.value,
      modo: modoConversao
    };
    salvarJsonStorage(STORAGE_PREFS_KEY, preferencias);
  }

  function carregarHistorico() {
    const dados = carregarJsonStorage(STORAGE_HISTORY_KEY, []);
    if (!Array.isArray(dados)) {
      return [];
    }
    return dados.slice(0, historicoMax);
  }

  function salvarHistorico() {
    salvarJsonStorage(STORAGE_HISTORY_KEY, historicoDados.slice(0, historicoMax));
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

  function formatarNumero(valor, maxCasas = 8) {
    return Number(valor).toLocaleString('pt-BR', {
      maximumFractionDigits: maxCasas
    });
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

  function atualizarModoUI() {
    const modoReverso = modoConversao === 'cripto-para-fiat';

    if (tituloConversaoEl) {
      tituloConversaoEl.textContent = modoReverso ? 'Cripto → Moeda' : 'Moeda → Cripto';
    }
    if (labelValorEl) {
      labelValorEl.textContent = modoReverso ? 'Quantidade de cripto' : 'Valor';
    }
    if (labelFiatEl) {
      labelFiatEl.textContent = modoReverso ? 'Moeda Fiat (destino)' : 'Moeda Fiat';
    }
    if (labelCriptoEl) {
      labelCriptoEl.textContent = modoReverso ? 'Criptomoeda (origem)' : 'Criptomoeda';
    }
    if (inverterConversaoBtn) {
      inverterConversaoBtn.textContent = modoReverso
        ? 'Inverter: Moeda → Cripto'
        : 'Inverter: Cripto → Moeda';
    }
  }

  function popularSelectCripto(filtro = '', valorPreferido = '') {
    const termo = filtro.trim().toLowerCase();
    const valorAtual = valorPreferido || selectCripto.value;
    selectCripto.innerHTML = '';

    const filtradas = listaCriptos.filter((cripto) => {
      if (!termo) {
        return true;
      }
      const nome = cripto.name.toLowerCase();
      const simbolo = cripto.symbol.toLowerCase();
      return nome.includes(termo) || simbolo.includes(termo);
    });

    if (filtradas.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.disabled = true;
      option.selected = true;
      option.textContent = 'Nenhuma cripto encontrada';
      selectCripto.appendChild(option);
      atualizarLogo();
      return;
    }

    filtradas.forEach((cripto) => {
      const option = document.createElement('option');
      option.value = cripto.id;
      option.textContent = `${cripto.name} (${cripto.symbol.toUpperCase()})`;
      selectCripto.appendChild(option);
    });

    const existeValorAtual = filtradas.some((cripto) => cripto.id === valorAtual);
    selectCripto.value = existeValorAtual ? valorAtual : filtradas[0].id;
    atualizarLogo();
  }

  function fetchComTimeout(url, ms) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
  }

  function carregarFallback() {
    listaCriptos = [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' },
      { id: 'ethereum', name: 'Ethereum', symbol: 'eth' },
      { id: 'tether', name: 'Tether', symbol: 'usdt' }
    ];
    mapaCriptos = {};
    listaCriptos.forEach((cripto) => {
      mapaCriptos[cripto.id] = cripto;
    });

    popularSelectCripto(buscaCriptoInput?.value || '');
    if (resultadoEl.textContent === '---') {
      resultadoEl.textContent = 'Modo offline: lista básica carregada.';
    }
  }

  async function carregarCriptos(preferencias) {
    try {
      const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1';
      resultadoEl.textContent = 'Carregando criptos...';
      const res = await fetchComTimeout(url, 8000);
      if (!res.ok) {
        throw new Error('Resposta inválida da API.');
      }
      const criptos = await res.json();

      listaCriptos = criptos.map((cripto) => ({
        id: cripto.id,
        name: cripto.name,
        symbol: cripto.symbol,
        image: cripto.image
      }));

      mapaCriptos = {};
      listaCriptos.forEach((cripto) => {
        mapaCriptos[cripto.id] = cripto;
      });

      const preferida = preferencias?.cripto || '';
      popularSelectCripto(buscaCriptoInput?.value || '', preferida);
      resultadoEl.textContent = '---';
      salvarPreferencias();
    } catch (error) {
      resultadoEl.textContent = 'Erro ao carregar criptos.';
      console.error(error);
      carregarFallback();
    }
  }

  function renderHistorico() {
    if (!historicoLista) {
      return;
    }
    historicoLista.innerHTML = '';

    if (historicoDados.length === 0) {
      const vazio = document.createElement('li');
      vazio.className = 'historico-vazio';
      vazio.textContent = 'Sem histórico ainda.';
      historicoLista.appendChild(vazio);
      return;
    }

    historicoDados.slice(0, historicoMax).forEach((registro) => {
      const item = document.createElement('li');
      item.className = 'historico-item';
      const linha = document.createElement('div');
      linha.textContent = registro.texto;
      const hora = document.createElement('div');
      hora.className = 'historico-time';
      hora.textContent = registro.hora;
      item.appendChild(linha);
      item.appendChild(hora);
      historicoLista.appendChild(item);
    });
  }

  function adicionarHistorico(texto) {
    const horaAtual = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    historicoDados.unshift({ texto, hora: horaAtual });
    historicoDados = historicoDados.slice(0, historicoMax);
    salvarHistorico();
    renderHistorico();
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

    if (cache && agora - cache.timestamp < cacheTTL) {
      return cache.preco;
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${criptoId}&vs_currencies=${fiat}`;
    const res = await fetchComTimeout(url, 8000);
    if (!res.ok) {
      throw new Error('Falha ao obter preço.');
    }
    const dados = await res.json();
    const preco = dados?.[criptoId]?.[fiat];

    if (typeof preco !== 'number') {
      throw new Error('Preço indisponível.');
    }

    cachePrecos.set(key, { preco, timestamp: agora });
    return preco;
  }

  async function converter(opcoes = {}) {
    const valor = Number(valorInput.value);
    const fiat = selectFiat.value;
    const criptoId = selectCripto.value;

    if (!valor || valor <= 0 || !criptoId) {
      resultadoEl.textContent = 'Preencha todos os campos com valores válidos.';
      return;
    }

    try {
      setLoading(true);
      const cripto = mapaCriptos[criptoId];
      const preco = await obterPreco(criptoId, fiat);
      let texto = '';

      if (modoConversao === 'fiat-para-cripto') {
        const totalCripto = valor / preco;
        texto = `${formatarNumero(valor, 2)} ${fiat.toUpperCase()} = ${formatarNumero(totalCripto, 8)} ${cripto.symbol.toUpperCase()} (${cripto.name})`;
      } else {
        const totalFiat = valor * preco;
        const fiatFormatado = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: fiat.toUpperCase()
        }).format(totalFiat);
        texto = `${formatarNumero(valor, 8)} ${cripto.symbol.toUpperCase()} (${cripto.name}) = ${fiatFormatado}`;
      }

      resultadoEl.textContent = texto;
      setUltimaAtualizacao();
      salvarPreferencias();

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

  const preferenciasIniciais = carregarPreferencias();
  if (preferenciasIniciais?.fiat) {
    const optionFiat = selectFiat.querySelector(`option[value="${preferenciasIniciais.fiat}"]`);
    if (optionFiat) {
      selectFiat.value = preferenciasIniciais.fiat;
    }
  }
  if (preferenciasIniciais?.valor) {
    valorInput.value = preferenciasIniciais.valor;
  }
  if (preferenciasIniciais?.modo === 'cripto-para-fiat' || preferenciasIniciais?.modo === 'fiat-para-cripto') {
    modoConversao = preferenciasIniciais.modo;
  }
  atualizarModoUI();

  historicoDados = carregarHistorico();
  renderHistorico();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    converter({ pushHistorico: true });
  });

  selectCripto.addEventListener('change', () => {
    atualizarLogo();
    salvarPreferencias();
    converter();
  });

  selectFiat.addEventListener('change', () => {
    salvarPreferencias();
    converter();
  });

  valorInput.addEventListener('input', () => {
    salvarPreferencias();
    converterComDebounce();
  });

  if (buscaCriptoInput) {
    buscaCriptoInput.addEventListener('input', () => {
      popularSelectCripto(buscaCriptoInput.value, selectCripto.value);
      salvarPreferencias();
      converterComDebounce();
    });
  }

  if (inverterConversaoBtn) {
    inverterConversaoBtn.addEventListener('click', () => {
      modoConversao = modoConversao === 'fiat-para-cripto' ? 'cripto-para-fiat' : 'fiat-para-cripto';
      atualizarModoUI();
      salvarPreferencias();
      converter();
    });
  }

  if (limparHistoricoBtn && historicoLista) {
    limparHistoricoBtn.addEventListener('click', () => {
      historicoDados = [];
      salvarHistorico();
      renderHistorico();
    });
  }

  carregarCriptos(preferenciasIniciais).then(() => {
    if (preferenciasIniciais?.cripto && mapaCriptos[preferenciasIniciais.cripto]) {
      selectCripto.value = preferenciasIniciais.cripto;
      atualizarLogo();
      salvarPreferencias();
    }
    if (valorInput.value) {
      converter();
    }
  });
});
=======
// Projeto reiniciado.
console.log("Projeto reiniciado do zero.");
>>>>>>> ba7c2a6 (refactor: reinicia projeto do zero com nova base)
