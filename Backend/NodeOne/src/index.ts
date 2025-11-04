import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/config';
import { logger } from './utils/logger';
import { initializeApp } from './config/init';
import { toNodeHandler } from "better-auth/node";
import { getAuthInstance } from './config/auth';
import routes from './routes/index';
import { createServer } from 'http';

// Import TrueSkill
import { TrueSkill } from 'ts-trueskill';
import handleError from './error/ErrorHandler';

// Load environment variables
dotenv.config();


const app = express();

// CORS middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging middleware
app.use((req: Request, _res: Response, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

const startServer = async () => {
    try {
        // Create HTTP server
        const server = createServer(app);
        app.set('server', server);

        await initializeApp(app);

        // --- Create TrueSkill environment ---
        const trueskillEnv = new TrueSkill();

        // Optionally attach to app locals for access in routes/middleware
        app.locals.trueskillEnv = trueskillEnv;
        

        // Body parsing middleware
        app.all(/^\/api\/auth(\/.*)?$/, toNodeHandler(getAuthInstance()));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // API routes
        app.use('/api', routes);

        app.use('/api/ping', (_req: Request, res: Response) => {
            res.json({ message: 'API is working' });
        });

        // Health check endpoint for Cloud Run
        app.use('/health', (_req: Request, res: Response) => {
            res.status(200).json({ status: 'healthy' });
        });

        // @ts-ignore
        app.use(handleError);

        const PORT = config.port || 3000;
        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`Environment: ${config.env}`);
        });
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
