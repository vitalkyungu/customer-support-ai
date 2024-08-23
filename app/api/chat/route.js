import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from '@pinecone-database/pinecone';

const systemPrompt = `System Prompt for Custosuppo-AI Customer Support Bot:

Role: You are Custosuppo-AI, an AI-powered customer support assistant designed to provide quick and accurate answers to user questions about various topics, summarize documents, and offer relevant information efficiently. Your goal is to assist users with factual inquiries, document summaries, and quick information retrieval. Maintain a clear, concise, and professional tone in all interactions.

Capabilities:

- Factual Information: Provide accurate and concise answers to user questions about specific facts or information related to Custosuppo-AI and its services.
- Document Summarization: Summarize documents or texts to give users quick insights and essential information.
- Quick Information Retrieval: Efficiently retrieve and present relevant information based on user queries or document content.

Limitations:

- Scope: Focus solely on factual information and document summaries related to Custosuppo-AI. Avoid opinions, speculative answers, or advice beyond the platform's scope.
- Complex Issues: Direct users to human support agents for questions or issues that require detailed explanations or in-depth support.

Tone and Style:

- Clear and Concise: Communicate in a straightforward manner, avoiding unnecessary jargon or complex language.
- Professional and Efficient: Ensure responses are professional, relevant, and aimed at quickly resolving the user’s query.`;

let index;

async function initPinecone() {
    // Initialize the Pinecone client with options
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY, // Ensure this environment variable is set
        //environment: "us-east-1", // Uncomment and replace with your actual environment if needed
    });

    return pinecone; // Return the Pinecone client instance
}

// Async function to initialize Pinecone client and index
async function initializeIndex() {
    const pinecone = await initPinecone(); // Initialize Pinecone client
    index = pinecone.Index("custosuppo-ai"); // Set the index
}

// Call the function to initialize the index
await initializeIndex(); // Ensure this is in an async context

async function storeDocumentEmbedding(documentText, documentId) {
    const openai = new OpenAI(process.env.OPENAI_API_KEY); // Use environment variable

    // Generate the embedding for the document
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: documentText,
    });

    const embedding = response.data[0].embedding;

    // Use the initialized index directly
    await index.upsert([{ id: documentId, values: embedding }]);
}

async function retrieveRelevantDocuments(queryText) {
    const openai = new OpenAI(process.env.OPENAI_API_KEY); // Use environment variable

    // Generate the embedding for the user's query
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: queryText,
    });

    const queryEmbedding = response.data[0].embedding;

    // Use the initialized index directly
    const queryResponse = await index.query({
        topK: 5, // Number of top similar documents to retrieve
        vector: queryEmbedding,
        includeMetadata: true, // Include metadata if needed
    });

    return queryResponse.matches;
}

// Handle a POST request to interact with the chatbot
export async function POST(req) {
    const openai = new OpenAI(process.env.OPENAI_API_KEY); // Use environment variable
    const data = await req.json();

    const queryText = data[data.length - 1].content;

    // Retrieve relevant documents from Pinecone
    const relevantDocs = await retrieveRelevantDocuments(queryText);

    // Combine relevant documents into the conversation context
    const completion = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            ...data,
            ...relevantDocs.map(doc => ({
                role: 'assistant',
                content: (doc.metadata && doc.metadata.text) 
                         ? doc.metadata.text 
                         : 'Here is some relevant information based on your query.'
            }))
        ],
        model: 'gpt-4o-mini',
        stream: true
    });
    

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        }
    });

    return new NextResponse(stream);
}

// Example: Store a document embedding (you can call this wherever appropriate)
const documentText = "Your document or knowledge base text here.";
const documentId = "document-id-1"; // Unique ID for the document
await storeDocumentEmbedding(documentText, documentId);