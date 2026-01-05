const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const mainRouter = require('./routes');

const app = express();

// Security headers and hardening
app.disable('x-powered-by');
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Content Security Policy tuned for current external resources
app.use(
    helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": [
                "'self'",
                'https://cdn.tailwindcss.com',
                'https://cdn.jsdelivr.net',
            ],
            "style-src": [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com',
                'https://cdnjs.cloudflare.com',
            ],
            "font-src": ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
            "img-src": ["'self'", 'data:', 'https:'],
            "connect-src": ["'self'"],
            "object-src": ["'none'"],
            "base-uri": ["'self'"],
            "frame-ancestors": ["'self'"],
        },
    })
);

// Body parsing with sane limits
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// HTTP Parameter Pollution protection
app.use(hpp());

// Rate limiting
app.use(
    rateLimit({
        windowMs: 60 * 1000,
        max: 120,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

// Compression
app.use(compression());

// Strict CORS (configure via ALLOWED_ORIGINS)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(
    cors({
        origin: allowedOrigins.length ? allowedOrigins : undefined,
        methods: ['GET', 'POST'],
        credentials: false,
    })
);

app.use('/api', mainRouter);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'index.html'));
});

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        message: err.message || 'Terjadi kesalahan internal pada server.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

module.exports = app;
