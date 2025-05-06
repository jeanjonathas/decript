/**
 * Middleware para autenticação por API key
 */
const apiKeyAuth = (req, res, next) => {
  // Obter a API key do cabeçalho ou query param
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  // Verificar se a API key foi fornecida
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Não autorizado',
      message: 'API key não fornecida'
    });
  }
  
  // Verificar se a API key é válida
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Acesso proibido',
      message: 'API key inválida'
    });
  }
  
  // Se a API key for válida, continuar para o próximo middleware/rota
  next();
};

module.exports = apiKeyAuth;
