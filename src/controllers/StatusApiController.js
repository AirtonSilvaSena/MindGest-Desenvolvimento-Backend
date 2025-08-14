module.exports = {
    async rotaPadrao(req, res) {
        res.json({
            message: 'Serviço de API ativo e disponível para requisições',
            status: 'OK',
            timestamp: new Date()
        });
    },

    async apiStatus(req, res) {
        res.json({
            status: 'OK',
            uptime: process.uptime(),
            timestamp: new Date()
        });
    }
}