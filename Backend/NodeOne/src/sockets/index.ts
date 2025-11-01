import { Server } from 'socket.io';
//import { quizSessionHandlers } from './quiz/quiz-session';
//import { quizQuestionHandlers } from './quiz/quiz-questions';


import { logger } from '../utils/logger';
import { quizV2Handler } from './quiz_v2/QuizSession';

export const initializeSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    // Initialize quiz handlers

    //quizSessionHandlers(socket);
    //quizQuestionHandlers(socket);
    quizV2Handler(socket);

    // Handle ping
    socket.on('ping', () => {
      logger.info('Ping received from:', socket.id);
      socket.emit('pong');
    });     

    // Handle disconnection
    socket.on('disconnect', async () => {     
      logger.info(`Socket disconnected: ${socket.id}`);
      // Reconnect functionality removed - sessions are managed by quiz handlers
    });
  });
};
