# WhatsDecrypt

Microserviço para descriptografar arquivos de mídia criptografados do WhatsApp (formato `.enc`) sem depender de bibliotecas pesadas como `@adiwajshing/baileys`.

## Funcionalidades

- Descriptografa arquivos de áudio do WhatsApp
- Implementa o padrão de criptografia do WhatsApp Web:
  - Derivação de chave com HKDF-SHA256
  - Descriptografia com AES-CBC
  - Verificação com HMAC-SHA256
- Expõe um endpoint REST para descriptografia
- Executa em contêiner Docker

## Requisitos

- Docker e Docker Compose
- Node.js 18+ (apenas para desenvolvimento local)

## Instalação e Execução

### Usando Docker Compose com Traefik (Produção)

1. Clone este repositório:
   ```bash
   git clone [url-do-repositorio]
   cd [nome-do-repositorio]
   ```

2. Certifique-se de que as redes Traefik já estão configuradas no seu servidor:
   ```bash
   docker network ls | grep traefik_public
   docker network ls | grep app_network
   ```

3. Se as redes não existirem, crie-as:
   ```bash
   docker network create traefik_public
   docker network create app_network
   ```

4. Inicie o serviço com Docker Compose:
   ```bash
   docker-compose up -d
   ```

5. O serviço estará disponível em `https://base64.supervet.app`

### Usando Docker Compose (Desenvolvimento Local)

Para desenvolvimento local sem Traefik, você pode modificar o arquivo docker-compose.yml para usar portas locais:

```yaml
version: '3.8'

services:
  whatsapp-decryptor:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: whatsapp-decryptor
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
```

E então execute:
```bash
docker-compose up -d
```

O serviço estará disponível em `http://localhost:3000`

### Execução Local (Desenvolvimento)

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor:
   ```bash
   npm start
   ```

## Como Usar

### Autenticação

Todas as requisições precisam incluir uma API key válida. Você pode fornecer a API key de duas maneiras:

1. **Cabeçalho HTTP**: Incluir o cabeçalho `X-API-Key` com o valor da API key
2. **Parâmetro de consulta**: Adicionar `?apiKey=sua_api_key` à URL

API Key: `Je@nfree2525`

### Endpoints

#### POST /decrypt-media (Recomendado)

Este endpoint recebe os parâmetros necessários para descriptografar qualquer tipo de mídia do WhatsApp (áudio, imagem, vídeo, documento).

#### POST /decrypt-audio (Legado)

Mantido por compatibilidade, redireciona para `/decrypt-media`.

### Corpo da Requisição (JSON):

```json
{
  "url": "URL do arquivo .enc",
  "mediaKey": "chave base64",
  "fileEncSha256": "hash base64",
  "fileSha256": "hash base64",
  "mimetype": "tipo MIME (opcional)",
  "messageId": "ID da mensagem (opcional)"
}
```

### Parâmetros:

- `url`: URL do arquivo criptografado (.enc)
- `mediaKey`: Chave de mídia em formato base64
- `fileEncSha256`: Hash SHA256 do arquivo criptografado em formato base64
- `fileSha256`: Hash SHA256 do arquivo original em formato base64
- `mimetype`: (Opcional) Tipo MIME do arquivo (ex: "audio/ogg; codecs=opus")
- `messageId`: (Opcional) ID da mensagem do WhatsApp

### Opções de Resposta

#### 1. Resposta em Base64 (Padrão)

Retorna um objeto JSON com o conteúdo em base64:

```json
{
  "success": true,
  "base64": "conteúdo da mídia em base64",
  "mimeType": "tipo MIME do arquivo",
  "size": 12345,
  "messageId": "ID da mensagem (se fornecido)",
  "downloadUrl": "URL para download direto"
}
```

#### 2. Download Direto

Adicione `?download=true` à URL para baixar o arquivo diretamente, sem conversão para base64.

### Resposta de Erro:

```json
{
  "success": false,
  "error": "Tipo de erro",
  "message": "Descrição detalhada do erro"
}
```

## Exemplos de Uso

### Exemplo com cURL

```bash
# Obter resposta em base64
curl -X POST https://base64.supervet.app/decrypt-media \
  -H "Content-Type: application/json" \
  -H "X-API-Key: Je@nfree2525" \
  -d '{
    "url": "https://mmg.whatsapp.net/path/to/audio.enc",
    "mediaKey": "sua_media_key_base64",
    "fileEncSha256": "seu_file_enc_sha256_base64",
    "fileSha256": "seu_file_sha256_base64",
    "messageId": "ID_DA_MENSAGEM"
  }'

# Download direto do arquivo
curl -X POST "https://base64.supervet.app/decrypt-media?download=true&apiKey=Je@nfree2525" \
  -H "Content-Type: application/json" \
  -d @dados.json \
  --output audio.ogg
```

### Exemplo com JavaScript (Fetch API)

```javascript
// Dados da requisição
const data = {
  url: "https://mmg.whatsapp.net/path/to/audio.enc",
  mediaKey: "sua_media_key_base64",
  fileEncSha256: "seu_file_enc_sha256_base64",
  fileSha256: "seu_file_sha256_base64",
  messageId: "ID_DA_MENSAGEM"
};

// Obter resposta em base64
async function decryptMedia() {
  const response = await fetch('https://base64.supervet.app/decrypt-media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'Je@nfree2525'
    },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  if (result.success) {
    // Usar o conteúdo base64
    console.log(`Mídia descriptografada: ${result.size} bytes`);
    return result.base64;
  } else {
    console.error(`Erro: ${result.error} - ${result.message}`);
    return null;
  }
}

// Download direto do arquivo
async function downloadMedia() {
  const response = await fetch('https://base64.supervet.app/decrypt-media?download=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'Je@nfree2525'
    },
    body: JSON.stringify(data)
  });
  
  if (response.ok) {
    // Converter a resposta para blob e criar URL para download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Criar link de download e clicar automaticamente
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'media.ogg';
    document.body.appendChild(a);
    a.click();
    
    // Limpar
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } else {
    console.error('Erro ao baixar o arquivo');
  }
}
```

### Exemplo com PHP

```php
<?php
// Dados da requisição
$data = [
  'url' => 'https://mmg.whatsapp.net/path/to/audio.enc',
  'mediaKey' => 'sua_media_key_base64',
  'fileEncSha256' => 'seu_file_enc_sha256_base64',
  'fileSha256' => 'seu_file_sha256_base64',
  'messageId' => 'ID_DA_MENSAGEM'
];

// Inicializar cURL
$ch = curl_init('https://base64.supervet.app/decrypt-media');

// Configurar a requisição
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'X-API-Key: Je@nfree2525'
]);

// Executar a requisição
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Processar a resposta
if ($httpCode === 200) {
  $result = json_decode($response, true);
  if ($result['success']) {
    // Usar o conteúdo base64
    $base64Content = $result['base64'];
    echo "Mídia descriptografada: {$result['size']} bytes\n";
    
    // Opcional: salvar o arquivo
    $binaryContent = base64_decode($base64Content);
    file_put_contents('media.ogg', $binaryContent);
  } else {
    echo "Erro: {$result['error']} - {$result['message']}\n";
  }
} else {
  echo "Erro HTTP: {$httpCode}\n";
}
?>
```

## Verificação de Saúde

O serviço expõe um endpoint `/health` para verificar se está funcionando corretamente:

```bash
curl http://localhost:3000/health
```

## Segurança

Este microserviço foi projetado para ser leve e seguro:
- Não utiliza bibliotecas externas desnecessárias
- Implementa verificações de integridade dos arquivos
- Valida todos os parâmetros de entrada

## Licença

MIT
