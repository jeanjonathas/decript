const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const WhatsAppDecryptor = require('../utils/decryptor');
const apiKeyAuth = require('../middleware/auth');

const router = express.Router();

// Função auxiliar para gerar um nome de arquivo temporário único
const getTempFilePath = (extension = 'bin') => {
  const tempDir = os.tmpdir();
  const randomId = crypto.randomBytes(16).toString('hex');
  return path.join(tempDir, `whatsapp-media-${randomId}.${extension}`);
};

/**
 * Endpoint para descriptografar arquivos de mídia do WhatsApp
 * POST /decrypt-media
 */
router.post('/decrypt-media', apiKeyAuth, async (req, res) => {
  try {
    console.log('Recebida requisição para descriptografar áudio');
    console.log('Corpo da requisição:', JSON.stringify(req.body, null, 2));
    
    // Extrair dados do corpo da requisição
    const { url, mediaKey, fileEncSha256, fileSha256, mimetype, messageId } = req.body;
    
    // Registrar o ID da mensagem se fornecido (opcional)
    if (messageId) {
      console.log(`ID da mensagem fornecido: ${messageId}`);
    }
    const mediaType = mimetype && mimetype.startsWith('audio') ? 'audio' : 
                     mimetype && mimetype.startsWith('image') ? 'image' : 
                     mimetype && mimetype.startsWith('video') ? 'video' : 'audio';

    console.log(`Tipo de mídia detectado: ${mediaType}`);

    // Validar os parâmetros obrigatórios
    if (!url || !mediaKey || !fileEncSha256 || !fileSha256) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros incompletos',
        message: 'Todos os parâmetros (url, mediaKey, fileEncSha256, fileSha256) são obrigatórios'
      });
    }

    // Validar formato dos parâmetros
    if (!url.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'URL inválida',
        message: 'A URL deve começar com http:// ou https://'
      });
    }

    try {
      // Converter os parâmetros de base64 para Buffer
      console.log('Convertendo parâmetros de base64 para Buffer');
      const mediaKeyBuffer = Buffer.from(mediaKey, 'base64');
      const fileEncSha256Buffer = Buffer.from(fileEncSha256, 'base64');
      const fileSha256Buffer = Buffer.from(fileSha256, 'base64');

      // Baixar o arquivo criptografado
      console.log(`Baixando arquivo de: ${url}`);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 segundos de timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      console.log(`Resposta recebida com status: ${response.status}`);
      console.log(`Tamanho dos dados recebidos: ${response.data.byteLength} bytes`);

      if (response.status !== 200) {
        return res.status(502).json({
          success: false,
          error: 'Erro ao baixar o arquivo',
          message: `Código de status: ${response.status}`
        });
      }

      // Converter o arquivo baixado para Buffer
      const encryptedData = Buffer.from(response.data);
      
      // Salvar o arquivo criptografado para debug (opcional)
      // await fs.writeFile(path.join(process.cwd(), 'encrypted.enc'), encryptedData);

      // Descriptografar o arquivo
      console.log('Descriptografando arquivo...');
      const decryptedData = WhatsAppDecryptor.decrypt(
        encryptedData,
        mediaKeyBuffer,
        fileEncSha256Buffer,
        fileSha256Buffer,
        mediaType
      );

      console.log(`Arquivo descriptografado com sucesso. Tamanho: ${decryptedData.length} bytes`);
      
      // Salvar o arquivo descriptografado para debug (opcional)
      // await fs.writeFile(path.join(process.cwd(), 'decrypted.ogg'), decryptedData);

      // Converter o arquivo descriptografado para base64
      const base64Data = decryptedData.toString('base64');
      console.log(`Convertido para base64. Tamanho da string: ${base64Data.length} caracteres`);

      // Salvar o tipo MIME e a extensão do arquivo
      const mimeType = mimetype || 'audio/ogg';
      const fileExtension = mimeType.includes('audio') ? 'ogg' : 
                           mimeType.includes('image') ? 'jpg' : 
                           mimeType.includes('video') ? 'mp4' : 'bin';
      
      // Verificar se o cliente solicitou download (via query param)
      if (req.query.download === 'true') {
        // Configurar headers para download
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="whatsapp-media-${messageId || 'file'}.${fileExtension}"`);
        res.setHeader('Content-Length', decryptedData.length);
        
        // Enviar o arquivo como resposta
        return res.send(decryptedData);
      } else {
        // Retornar o resultado em JSON com base64
        return res.status(200).json({
          success: true,
          base64: base64Data,
          mimeType: mimeType,
          size: decryptedData.length,
          messageId: messageId || null,
          downloadUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}?download=true`
        });
      }

    } catch (error) {
      console.error('Erro ao processar a descriptografia:', error);
      return res.status(400).json({
        success: false,
        error: 'Erro na descriptografia',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (error) {
    console.error('Erro geral ao processar a requisição:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Manter o endpoint /decrypt-audio por compatibilidade
router.post('/decrypt-audio', apiKeyAuth, async (req, res) => {
  // Redirecionar para o novo endpoint
  return router.handle(req, res);
});

module.exports = router;
