const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0', // versão do OpenAPI
    info: {
      title: 'MindGest API',
      version: '1.0.0',
      description: 'Documentação da API do MindGest',
    },
    servers: [
      {
        url: 'http://localhost:3000', // endereço do seu backend
      },
    ],
  },
  apis: ['./src/routes/*.js'], // vai ler comentários nas rotas
};

const swaggerSpec = swaggerJsDoc(options);

function setupSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
