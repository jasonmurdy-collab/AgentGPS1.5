import { GoogleGenAI, Type } from "@google/genai";
import { QuizContent, Playbook, NewAgentGoalTemplate } from "../types";

// Initialize GoogleGenAI without an API key. 
// The server-side proxy handles API key injection for security in a client-side application.
const ai = new GoogleGenAI({});

const quizSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'A unique identifier for the question, like a timestamp.' },
        questionText: { type: Type.STRING, description: 'The text of the question.' },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'A unique identifier for the option.' },
              text: { type: Type.STRING, description: 'The text of the answer option.' },
              isCorrect: { type: Type.BOOLEAN, description: 'Whether this option is the correct answer.' },
            },
            required: ['id', 'text', 'isCorrect'],
          },
        },
      },
      required: ['id', 'questionText', 'options'],
    },
  };
  

export async function generateQuiz(sourceText: string, numQuestions: number): Promise<QuizContent> {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Based on the following text, generate a multiple-choice quiz with exactly ${numQuestions} questions. Each question must have between 3 and 4 options, with only one being correct. Adhere strictly to the provided JSON schema.\n\nText: "${sourceText}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: quizSchema,
            systemInstruction: "You are an expert instructional designer for real estate professionals. Your task is to create high-quality, relevant quiz questions from provided text. Ensure all IDs are unique.",
        }
    });
    
    const text = response.text.trim();
    if (!text) {
        throw new Error("API returned an empty response.");
    }

    const quizData = JSON.parse(text);

    // Validate and format the data to match QuizContent type precisely
    const formattedQuiz: QuizContent = quizData.map((q: any, qIndex: number) => ({
      id: q.id || `q-${Date.now()}-${qIndex}`,
      questionText: q.questionText || '',
      options: (q.options || []).map((opt: any, oIndex: number) => ({
        id: opt.id || `o-${Date.now()}-${qIndex}-${oIndex}`,
        text: opt.text || '',
        isCorrect: !!opt.isCorrect,
      })),
    }));

    return formattedQuiz;
  } catch (error) {
    console.error("Error generating quiz with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate quiz: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the quiz.");
  }
}

const playbookSchema = {
    type: Type.OBJECT,
    properties: {
        modules: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    lessons: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                content: { type: Type.STRING, description: "Detailed, practical text content of about 200-300 words for the lesson, in Markdown format." }
                            },
                            required: ['title', 'content']
                        }
                    }
                },
                required: ['title', 'lessons']
            }
        }
    },
    required: ['modules']
};


export async function generatePlaybookFromOutline(title: string, outline: string): Promise<Pick<Playbook, 'modules'>> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `The playbook is titled "${title}". The provided outline is:\n\n${outline}\n\nBased on this, generate the full playbook content.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: playbookSchema,
                systemInstruction: "You are an expert real estate coach and instructional designer. Your task is to create a complete, high-quality real estate training playbook from a title and a simple outline. The outline format is `Module Title:\n - Lesson 1 Title\n - Lesson 2 Title`. For each lesson, write detailed, practical text content of about 200-300 words. The content should be insightful, actionable, and formatted in Markdown. Respond ONLY with the JSON object that strictly follows the provided schema.",
            }
        });

        const text = response.text.trim();
        if (!text) throw new Error("API returned an empty response.");
        
        const generatedData = JSON.parse(text);

        // Map generated data to our Playbook type, adding client-side IDs and orders
        const playbookData: Pick<Playbook, 'modules'> = {
            modules: (generatedData.modules || []).map((mod: any, modIndex: number) => ({
                id: `mod-${Date.now()}-${modIndex}`,
                title: mod.title,
                order: modIndex,
                lessons: (mod.lessons || []).map((les: any, lesIndex: number) => ({
                    id: `les-${Date.now()}-${modIndex}-${lesIndex}`,
                    title: les.title,
                    type: 'text',
                    content: les.content,
                    order: lesIndex,
                }))
            }))
        };
        return playbookData;

    } catch (error) {
        console.error("Error generating playbook with Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate playbook: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating the playbook.");
    }
}

export async function generateRolePlayScenario(lessonContent: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a role-play scenario based on this lesson text: "${lessonContent}"`,
            config: {
                systemInstruction: "You are a real estate coaching expert. Based on the lesson text, create a realistic role-playing scenario for an agent to practice. Format it clearly using Markdown with sections for '### Scenario', '### Client Goal', and '### Potential Objections'.",
            }
        });
        return `\n\n---\n\n## Role-Playing Practice\n\n${response.text.trim()}`;
    } catch (error) {
        console.error("Error generating role-play scenario:", error);
        throw new Error("Failed to generate role-play scenario.");
    }
}

const goalSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        metric: { type: Type.STRING },
        targetValue: { type: Type.NUMBER },
        type: { type: Type.STRING, enum: ['Annual', 'Quarterly', 'Weekly'] },
    },
    required: ['title', 'metric', 'targetValue', 'type']
};

export async function generateGoalSuggestions(): Promise<Partial<NewAgentGoalTemplate>> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a single, impactful, and specific SMART goal template for a brand new real estate agent's first 30 days. Examples: 'Hold first open house', 'Add 50 people to database', 'Make 100 prospecting calls'. Respond strictly with the JSON schema.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: goalSuggestionSchema,
                systemInstruction: "You are an expert real estate coach. Your task is to generate one clear, actionable goal for a new agent.",
            }
        });
        
        const text = response.text.trim();
        if (!text) throw new Error("API returned an empty response.");
        
        const goalData = JSON.parse(text);
        return goalData as Partial<NewAgentGoalTemplate>;

    } catch (error) {
        console.error("Error generating goal suggestion:", error);
        throw new Error("Failed to generate goal suggestion.");
    }
}