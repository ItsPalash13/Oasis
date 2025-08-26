import OpenAI from "openai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Centralized AI client configuration
function createAIClient() {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'openai';
  
  if (provider === 'openrouter') {
    return new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "ProjectX",
      },
    });
  } else {
    // Default to OpenAI
    return new OpenAI({
      apiKey: process.env.GPT4
    });
  }
}

// Get the appropriate model name based on provider
function getModelName(provider: string, defaultModel: string = "gpt-4"): string {
  if (provider === 'openrouter') {
    return "deepseek/deepseek-r1:free"; // OpenRouter model
  }
  return defaultModel;
}

// Centralized AI completion function
async function createAIChatCompletion(params: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  systemMessage?: string;
}): Promise<string> {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'openai';
  const client = createAIClient();
  const model = getModelName(provider, params.model);
  
  // Prepare messages
  const messages = params.systemMessage 
    ? [{ role: "system", content: params.systemMessage }, ...params.messages]
    : params.messages;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: messages as any,
      temperature: params.temperature || 0.6,
      max_tokens: params.max_tokens || 150,
    });
    console.log("response", response.choices[0]?.message);
    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error('AI completion error:', error);
    throw error;
  }
}

interface LevelFeedbackParams {
  levelName: string;
  levelTopics: string[];
  studentCorrectQuestions: number;
  requiredCorrectQuestions: number;
  accuracy: number;
  timeTaken: string;
  levelResult: string;
  nextLevel: string;
  firstName: string;
  newHighScore?: boolean;
}

async function getShortLevelFeedback({ levelName, levelTopics, studentCorrectQuestions, requiredCorrectQuestions, accuracy, timeTaken, levelResult, nextLevel, firstName, newHighScore = false }: LevelFeedbackParams): Promise<string> {
  const userPrompt = `
You're a motivational AI tutor. Give a personalized end-of-level message in under 30 words based on the following:

Student: ${firstName}
Level: ${levelName}
Topics: ${levelTopics.join(", ")}
Correct Questions: ${studentCorrectQuestions}
Required Correct: ${requiredCorrectQuestions}
Accuracy: ${accuracy}%
Time: ${timeTaken}
Result: ${levelResult}
${newHighScore ? 'NEW HIGH SCORE ACHIEVED!' : ''}
Next: ${nextLevel}

${levelResult === 'completed' ? 
  'Make it short, supportive, and energizing. Use the student\'s first name and mention strengths briefly, and hype up the next level.' :
  'Make it encouraging and motivating. Use the student\'s first name, acknowledge their effort, and encourage them to try again. Mention how close they are to completing the level.'
}
${newHighScore ? 'If it\'s a new high score, make sure to celebrate that achievement!' : ''}
`;

  console.log("userPrompt", userPrompt);

  if(process.env.NODE_ENV === 'development') {
    return "This is a test prompt";
  }
  
  return await createAIChatCompletion({
    messages: [
      { role: "user", content: userPrompt }
    ],
    systemMessage: "You are a concise and encouraging AI tutor.",
    temperature: 0.6,
    max_tokens: 60 // Max ~30 words
  });
}

// New: Generate a concise solution/explanation for a question (max ~50 words)
interface QuestionSolutionParams {
  question: string;
  options?: string[]; // Optional MCQ options
  correctAnswer?: string; // Optional known correct answer text/label
  topic?: string; // Optional topic or tag
}

async function getQuestionSolution({ question, options = [], correctAnswer, topic }: QuestionSolutionParams): Promise<string> {
  const parts: string[] = [
    `Question: ${question}`
  ];
  if (options.length > 0) {
    parts.push(`Options: ${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(' ')}`);
  }
  if (correctAnswer) {
    parts.push(`Correct: ${correctAnswer}`);
  }
  if (topic) {
    parts.push(`Topic: ${topic}`);
  }

  const userPrompt = `Provide a clear, step-by-step solution under 50 words for the following problem. Avoid fluff, no markdown, no preface; return only the explanation.\n\n${parts.join('\n')}`;

  return await createAIChatCompletion({
    messages: [
      { role: "user", content: userPrompt }
    ],
    systemMessage: "You explain answers concisely. Reply with one short paragraph under 50 words. No bullets, no headings, no markdown.",
    temperature: 0.3,
    max_tokens: 90
  });
}

export { getShortLevelFeedback, createAIChatCompletion, createAIClient, getQuestionSolution };
