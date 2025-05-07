const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const WhatsAppDecryptor = require('../utils/decryptor');
const apiKeyAuth = require('../middleware/auth');

const router = express.Router();

/**
 * Endpoint para download direto de arquivos de mídia do WhatsApp
 * GET /download/:id
 */
router.get('/download/:id', apiKeyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o ID é válido
    if (!id || id.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'ID de download inválido'
      });
    }
    
    // Recuperar os dados do cache (simulado aqui com uma variável global)
    // Em produção, use Redis ou outro mecanismo de cache
    if (!global.downloadCache || !global.downloadCache[id]) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado ou expirado'
      });
    }
    
    const cachedData = global.downloadCache[id];
    const { decryptedData, mimeType, fileName } = cachedData;
    
    // Configurar headers para download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', decryptedData.length);
    
    // Enviar o arquivo como resposta
    return res.send(decryptedData);
    
  } catch (error) {
    console.error('Erro ao processar o download:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;
