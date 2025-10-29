import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';

type DummyQuestion = {
  id: string;
  ques: string;
  options: string[];
  correctIndex: number;
};

// Static dummy question for the loop
const DUMMY_QUESTION: DummyQuestion = {
  id: 'q1',
  ques: 'What is 2 + 2?',
  options: ['3', '4', '5', '22'],
  correctIndex: 1,
};

async function fetch_question(): Promise<DummyQuestion> {
  // Simulate async fetch
  return DUMMY_QUESTION;
}

async function checkanswer(
  questionId: string,
  answerIndex: number,
  currentQuestion?: DummyQuestion
): Promise<{ isCorrect: boolean; correctIndex: number }> {
  const q = currentQuestion && currentQuestion.id === questionId ? currentQuestion : DUMMY_QUESTION;
  const isCorrect = answerIndex === q.correctIndex;
  return { isCorrect, correctIndex: q.correctIndex };
}

async function updatets(): Promise<boolean> {
  // Dummy always true
  return true;
}

export const quizV2DummyHandlers = (socket: Socket) => {
  logger.info(`Dummy Quiz v2 socket connected: ${socket.id}`);

  // On initiate: fetch question then emit question (without revealing the answer)
  socket.on('initiate', async () => {
    try {
      const q = await fetch_question();
      // Store the current question on the socket for this simple loop
      // socket.io v4 provides a data bag on the socket instance
      (socket as any).data = (socket as any).data || {};
      (socket as any).data.currentQuestion = q;

      socket.emit('question', {
        id: q.id,
        ques: q.ques,
        options: q.options,
      });
    } catch (error: any) {
      logger.error('Error in initiate:', error);
      socket.emit('quizError', { type: 'failure', message: error?.message || 'Failed to initiate' });
    }
  });

  // On answer: checkanswer -> updatets -> emit result (with correctness and correct option)
  socket.on('answer', async ({ id, answerIndex }: { id: string; answerIndex: number }) => {
    try {
      const currentQuestion: DummyQuestion | undefined = (socket as any).data?.currentQuestion;
      const { isCorrect, correctIndex } = await checkanswer(id, answerIndex, currentQuestion);
      await updatets();

      const correctOption = (currentQuestion || DUMMY_QUESTION).options[correctIndex];

      socket.emit('result', {
        isCorrect,
        correctIndex,
        correctOption,
      });
    } catch (error: any) {
      logger.error('Error in answer:', error);
      socket.emit('quizError', { type: 'failure', message: error?.message || 'Failed to submit answer' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Dummy Quiz v2 socket disconnected: ${socket.id}`);
  });
};

export type { DummyQuestion };
export { fetch_question, checkanswer, updatets };


