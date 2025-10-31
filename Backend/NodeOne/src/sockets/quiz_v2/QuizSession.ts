import { fetchQuestionByMu } from "services/questions/FetchQuestions";
import { Socket } from "socket.io";
import { logger } from "utils/logger";

export const quizV2Handler = (socket: Socket) => {
  logger.info(` Quiz v2 socket connected: ${socket.id}`);

  // On initiate: fetch question then emit question (without revealing the answer)
  socket.on('initiate', async () => {
    try {
     const question = await fetchQuestionByMu({ mu: socket.data.mu || 0 });
      socket.emit('question', {
       question: question
      });
    } catch (error: any) {
      logger.error('Error in initiate:', error);
      socket.emit('quizError', { type: 'failure', message: error?.message || 'Failed to initiate' });
    }
  });


  socket.on('disconnect', () => {
    logger.info(`Dummy Quiz v2 socket disconnected: ${socket.id}`);
  });
};