const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const decryptRoutes = require('./routes/decrypt');
const downloadRoutes = require('./routes/download');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/', decryptRoutes);
app.use('/', downloadRoutes);

// Rota básica para verificar se o serviço está funcionando
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Serviço funcionando corretamente' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
