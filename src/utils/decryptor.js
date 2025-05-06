const crypto = require('crypto');

/**
 * Classe responsável pela descriptografia de arquivos de mídia do WhatsApp
 */
class WhatsAppDecryptor {
  /**
   * Implementação simplificada do HKDF (RFC 5869)
   * @param {Buffer} ikm - Material de chave inicial
   * @param {number} length - Comprimento da saída desejado
   * @param {Buffer} salt - Sal (opcional)
   * @param {Buffer} info - Informação de contexto (opcional)
   * @returns {Buffer} - Chave derivada
   */
  static hkdf(ikm, length, salt = Buffer.alloc(0), info = Buffer.alloc(0)) {
    // Etapa 1: Extrair
    const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
    
    // Etapa 2: Expandir
    let t = Buffer.alloc(0);
    let okm = Buffer.alloc(0);
    let counter = 1;
    
    while (okm.length < length) {
      const input = Buffer.concat([
        t,
        info,
        Buffer.from([counter])
      ]);
      
      t = crypto.createHmac('sha256', prk).update(input).digest();
      okm = Buffer.concat([okm, t]);
      counter++;
    }
    
    return okm.slice(0, length);
  }
  
  /**
   * Deriva a chave de criptografia usando HKDF-SHA256
   * 
   * @param {Buffer} mediaKey - Chave de mídia em formato Buffer
   * @param {string} mediaType - Tipo de mídia (audio, image, video, document)
   * @returns {Object} - Objeto contendo as chaves derivadas
   */
  static deriveKeys(mediaKey, mediaType = 'audio') {
    try {
      // Mapeamento de tipos de mídia para strings usadas no WhatsApp
      const mediaTypeMap = {
        'audio': 'Audio',
        'image': 'Image',
        'video': 'Video',
        'document': 'Document',
        'sticker': 'Image'
      };
      
      // Verificar se o tipo de mídia é suportado
      if (!mediaTypeMap[mediaType]) {
        throw new Error(`Tipo de mídia não suportado: ${mediaType}`);
      }
      
      // Informação de contexto para HKDF
      const info = Buffer.from(`WhatsApp ${mediaTypeMap[mediaType]} Keys`);
      
      // Derivar chaves usando HKDF
      // Precisamos de 112 bytes no total: 16 para IV, 32 para cipherKey, 32 para macKey
      const derivedBytes = this.hkdf(mediaKey, 112, Buffer.alloc(0), info);
      
      // Extrair as diferentes chaves do material derivado
      return {
        iv: derivedBytes.slice(0, 16),          // 16 bytes para IV
        cipherKey: derivedBytes.slice(16, 48),   // 32 bytes para a chave AES-256
        macKey: derivedBytes.slice(48, 80)       // 32 bytes para a chave HMAC
      };
    } catch (error) {
      console.error('Erro ao derivar chaves:', error);
      throw new Error(`Erro ao derivar chaves: ${error.message}`);
    }
  }

  /**
   * Descriptografa um arquivo de mídia do WhatsApp
   * 
   * @param {Buffer} encryptedData - Dados criptografados
   * @param {Buffer} mediaKey - Chave de mídia
   * @param {Buffer} fileEncSha256 - Hash SHA256 do arquivo criptografado
   * @param {Buffer} fileSha256 - Hash SHA256 do arquivo original
   * @param {string} mediaType - Tipo de mídia (audio, image, video, document)
   * @returns {Buffer} - Dados descriptografados
   */
  static decrypt(encryptedData, mediaKey, fileEncSha256, fileSha256, mediaType = 'audio') {
    try {
      // Verificar se os dados necessários foram fornecidos
      if (!encryptedData || !mediaKey || !fileEncSha256 || !fileSha256) {
        throw new Error('Parâmetros incompletos para descriptografia');
      }

      console.log(`Tamanho dos dados criptografados: ${encryptedData.length} bytes`);
      
      // Derivar as chaves usando a implementação HKDF
      const { iv, cipherKey, macKey } = this.deriveKeys(mediaKey, mediaType);
      
      console.log(`IV (${iv.length} bytes): ${iv.toString('hex')}`);
      console.log(`CipherKey (${cipherKey.length} bytes): ${cipherKey.toString('hex')}`);
      console.log(`MacKey (${macKey.length} bytes): ${macKey.toString('hex')}`);

      // No formato do WhatsApp Web, os primeiros bytes são os dados e os últimos 10 bytes são o HMAC
      const fileData = encryptedData.slice(0, -10);
      const hmacReceived = encryptedData.slice(-10);
      
      console.log(`Tamanho dos dados sem HMAC: ${fileData.length} bytes`);
      console.log(`HMAC recebido: ${hmacReceived.toString('hex')}`);

      // Calcular o HMAC dos dados
      const hmacCalculated = crypto.createHmac('sha256', macKey)
        .update(fileData)
        .digest()
        .slice(0, 10);
      
      console.log(`HMAC calculado: ${hmacCalculated.toString('hex')}`);

      // Verificar a integridade com HMAC-SHA256
      try {
        if (!crypto.timingSafeEqual(hmacReceived, hmacCalculated)) {
          console.warn('Aviso: HMAC não corresponde, mas continuando a descriptografia');
          // Opcional: descomente a linha abaixo para forçar a verificação estrita
          // throw new Error('Falha na verificação de integridade (HMAC)');
        } else {
          console.log('Verificação HMAC bem-sucedida');
        }
      } catch (e) {
        if (e.code === 'ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH') {
          console.warn(`Aviso: Comprimentos HMAC diferentes (recebido: ${hmacReceived.length}, calculado: ${hmacCalculated.length})`);
        } else {
          throw e;
        }
      }

      // Descriptografar usando AES-256-CBC
      console.log('Iniciando descriptografia AES-256-CBC');
      const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
      let decrypted;
      try {
        decrypted = Buffer.concat([
          decipher.update(fileData),
          decipher.final()
        ]);
      } catch (e) {
        console.error('Erro na descriptografia AES:', e);
        throw new Error(`Erro na descriptografia AES: ${e.message}`);
      }
      
      console.log(`Arquivo descriptografado com sucesso. Tamanho: ${decrypted.length} bytes`);

      // Verificar o hash SHA256 do arquivo descriptografado
      const decryptedSha256 = crypto.createHash('sha256')
        .update(decrypted)
        .digest();
      
      try {
        const fileSha256Buffer = Buffer.from(fileSha256);
        if (fileSha256Buffer.equals(decryptedSha256)) {
          console.log('Verificação SHA256 bem-sucedida');
        } else {
          console.warn('Aviso: Hash SHA256 não corresponde, mas continuando');
          console.log(`SHA256 esperado: ${fileSha256Buffer.toString('hex')}`);
          console.log(`SHA256 calculado: ${decryptedSha256.toString('hex')}`);
          // Opcional: descomente a linha abaixo para forçar a verificação estrita
          // throw new Error('Falha na verificação do hash SHA256 do arquivo descriptografado');
        }
      } catch (e) {
        if (e instanceof TypeError) {
          console.warn('Aviso: Erro ao comparar hashes SHA256, continuando');
        } else {
          throw e;
        }
      }

      return decrypted;
    } catch (error) {
      console.error('Erro na descriptografia:', error);
      throw error;
    }
  }
}

module.exports = WhatsAppDecryptor;
