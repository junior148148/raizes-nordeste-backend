require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const routes = require('./api/routes');
const swaggerDocument = require('./api/swagger');
const { errorMiddleware } = require('./api/middlewares/errorMiddleware');

const app = express();
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(routes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Raízes do Nordeste rodando em http://localhost:${PORT}`);
  console.log(`Documentação Swagger disponível em http://localhost:${PORT}/api-docs`);
});