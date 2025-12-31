import { GoogleGenAI, Type } from '@google/genai';
import { AISetResponse, QuizQuestion } from '../types';

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// New function to extract text from images using Gemini
export const extractTextFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: "Transcribe all text from this image exactly as it appears. Do not summarize." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Image Extraction Error:", error);
    throw new Error("Failed to extract text from image.");
  }
};

export const generateStudyContent = async (
  text: string, 
  difficulty: 'Easy' | 'Medium' | 'Hard'
): Promise<AISetResponse> => {
  const ai = getAI();

  const prompt = `
    You are an expert educational tutor. Analyze the provided study notes and generate a comprehensive study set.
    
    Difficulty Level: ${difficulty}
    
    Rules:
    1. STRICTLY base all content on the provided text.
    2. Identify ALL key concepts, vocabulary, dates, formulas, and important details.
    3. Generate Flashcards for EVERY important concept found in the text. Do not limit the number; ensure comprehensive coverage.
    4. Generate 6 Quiz Questions initially. Mix 'multiple-choice', 'true-false', and 'short-answer'.
    5. For multiple-choice, provide 1 correct answer and 3 realistic distractors.
    6. Generate a 'Study Guide': A markdown-formatted summary of the key takeaways, bullet points, and likely exam topics.
    
    Input Text:
    "${text.substring(0, 50000)}" 
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      flashcards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          },
          required: ["front", "back"]
        }
      },
      quizQuestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["multiple-choice", "short-answer", "true-false"] },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["type", "question", "correctAnswer", "explanation"]
        }
      },
      studyGuide: { type: Type.STRING, description: "Markdown formatted summary" }
    },
    required: ["title", "description", "tags", "flashcards", "quizQuestions", "studyGuide"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from AI");

    return JSON.parse(responseText) as AISetResponse;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate study set. Please try again.");
  }
};

export const generateQuizQuestions = async (
  text: string,
  count: number,
  difficulty: string
): Promise<QuizQuestion[]> => {
  const ai = getAI();
  const prompt = `
    Generate ${count} distinct quiz questions based on the text below.
    Difficulty: ${difficulty}
    Include a mix of multiple-choice, true-false, and short-answer questions.
    
    Input Text:
    "${text.substring(0, 30000)}"
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ["multiple-choice", "short-answer", "true-false"] },
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctAnswer: { type: Type.STRING },
        explanation: { type: Type.STRING }
      },
      required: ["type", "question", "correctAnswer", "explanation"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });
    
    const parsed = JSON.parse(response.text || '[]');
    // Add IDs
    return parsed.map((q: any) => ({ ...q, id: crypto.randomUUID() }));
  } catch (error) {
    console.error("Quiz Generation Error", error);
    throw new Error("Failed to generate new questions.");
  }
};

export const modifyCardWithAI = async (front: string, back: string, instruction: string): Promise<{front: string, back: string}> => {
  const ai = getAI();
  const prompt = `
    Current Flashcard:
    Front: "${front}"
    Back: "${back}"
    
    Instruction: "${instruction}"
    
    Output the modified Front and Back.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      front: { type: Type.STRING },
      back: { type: Type.STRING }
    },
    required: ["front", "back"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    }
  });

  return JSON.parse(response.text || '{}');
};
