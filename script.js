// =========================
// Referencias do DOM
// =========================
const form = document.getElementById("converter-form");
const amountInput = document.getElementById("amount");
const fiatSelect = document.getElementById("fiat");
const cryptoSelect = document.getElementById("crypto");
const resultText = document.getElementById("result-text");
const resultMeta = document.getElementById("result-meta");

// =========================
// Configuracao da API
// =========================
const API_BASE = "https://api.coingecko.com/api/v3";
const FIAT_DEFAULT = "brl";

const FALLBACK_CRYPTOS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH" },
  { id: "tether", name: "Tether", symbol: "USDT" }
];

// =========================
// Utilitarios de UI
// =========================
function updateMeta() {
  const now = new Date();
  resultMeta.textContent = `Atualizado as ${now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function setResult(message, isError = false) {
  resultText.textContent = message;
  resultText.style.color = isError ? "#ffb4b4" : "";
  updateMeta();
}

function formatFiat(value, fiat) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: fiat.toUpperCase()
  }).format(value);
}

// =========================
// Montagem do select de criptos
// =========================
function populateCryptoSelect(cryptos) {
  cryptoSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione...";
  cryptoSelect.appendChild(placeholder);

  cryptos.forEach((crypto) => {
    const option = document.createElement("option");
    option.value = crypto.id;
    option.textContent = `${crypto.name} (${crypto.symbol})`;
    cryptoSelect.appendChild(option);
  });
}

// =========================
// Carregamento de criptos
// =========================
async function loadCryptos() {
  try {
    const url = `${API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Falha ao carregar criptos");
    }

    const data = await response.json();

    const cryptos = data.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase()
    }));

    populateCryptoSelect(cryptos);
    fiatSelect.value = FIAT_DEFAULT;
  } catch (error) {
    populateCryptoSelect(FALLBACK_CRYPTOS);
    setResult("Modo offline: lista basica carregada.", true);
    console.error(error);
  }
}

// =========================
// Conversao
// =========================
async function convert(event) {
  event.preventDefault();

  const amount = Number(amountInput.value);
  const fiat = fiatSelect.value;
  const cryptoId = cryptoSelect.value;

  if (!Number.isFinite(amount) || amount <= 0 || !cryptoId) {
    setResult("Digite um valor maior que zero e selecione a cripto.", true);
    return;
  }

  try {
    setResult("Convertendo...");

    const url = `${API_BASE}/simple/price?ids=${cryptoId}&vs_currencies=${fiat}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Falha na API de preco");
    }

    const data = await response.json();
    const price = data?.[cryptoId]?.[fiat];

    if (typeof price !== "number") {
      throw new Error("Preco indisponivel");
    }

    const totalCrypto = amount / price;
    const selectedText = cryptoSelect.options[cryptoSelect.selectedIndex].textContent;
    const symbolMatch = selectedText.match(/\(([^)]+)\)$/);
    const symbol = symbolMatch ? symbolMatch[1] : "";

    const fiatFormatted = formatFiat(amount, fiat);
    setResult(`${fiatFormatted} = ${totalCrypto.toFixed(8)} ${symbol}`);
  } catch (error) {
    setResult("Nao foi possivel converter agora. Tente novamente.", true);
    console.error(error);
  }
}

// =========================
// Inicializacao
// =========================
form.addEventListener("submit", convert);
loadCryptos();
