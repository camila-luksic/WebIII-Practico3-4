const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const corsOptions = {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
   allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Credentials',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
};

// Middlewares
app.use(morgan('dev'));
app.use(cors(corsOptions));

app.use(cookieParser());

// Proxy config primero (ANTES de usarlo)
const onProxyReq = function (proxyReq, req, res) {
      console.log('✅ onProxyReq ejecutado');
    console.log(`➡️ Proxy enviando a: ${proxyReq.path}`);
    const token = req.cookies.access;
    if (token) {
        proxyReq.setHeader('Authorization', 'Bearer ' + token);
    }
     // Reenviar el Content-Type del request original (muy importante)
    if (req.headers['content-type']) {
        proxyReq.setHeader('Content-Type', req.headers['content-type']);
    }
};

const apiProxy = createProxyMiddleware({
      target: 'http://127.0.0.1:8000/libreria/',
    changeOrigin: true,
    pathRewrite: (path, req) => {
        console.log(path)
        console.log(path.replace('/proxy', ''))
        return path.replace('/proxy', '');
    },
    timeout: 10000,
     on: {
    proxyReq: onProxyReq,
    proxyRes: (proxyRes, req, res) => {
        console.log(`✅ Respuesta del backend: ${proxyRes.statusCode} para ${req.originalUrl}`);
         proxyRes.on('data', (chunk) => {
        console.log('📦 Data recibida del backend:', chunk.toString());
    });
    },
    error: (err, req, res) => {
        console.error('🛑 Error en el proxy:', err.message);
        res.status(500).json({ error: 'Error en el proxy' });
    },
},
    logLevel: 'debug',
    logProvider: () => console,
});

// Middleware de logging del proxy
// app.use('/proxy', (req, res, next) => {
//     console.log(`🟡 Express recibió la petición: ${req.method} ${req.originalUrl}`);
//      console.log('📥 Body recibido en Express:', req.body); // <- AÑADE ESTO
   
//     // console.log(`Proxy recibio petición: ${req.method} ${req.originalUrl} -> destino: ${req.originalUrl.replace(/^\/proxy/, '')}`);
//     next();
// });
// app.use('/proxy', (req, res, next) => {
//     console.log('🧪 Entrando al middleware apiProxy');
//     apiProxy(req, res, next);
// });
app.use('/proxy', apiProxy);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas internas
try {
    require('./routes/auth.routes')(app);
} catch (error) {
    console.warn("Rutas de autenticación no encontradas o con error:", error.message);
}

app.listen(port, () => {
    console.log("🟢 Proxy corriendo en puerto " + port);
});
