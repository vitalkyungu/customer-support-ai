import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getIndex } from './pineconeClient'; // Import the function to get Pinecone index

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

async function storeDocumentEmbedding(documentText, documentId, index) {
    const openai = new OpenAI("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"); // Replace with your OpenAI API key

    // Generate the embedding for the document
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: documentText,
    });

    const embedding = response.data[0].embedding;

    // Store the embedding in Pinecone with the document ID
    await index.upsert([{ id: documentId, values: embedding }]);
}

async function retrieveRelevantDocuments(queryText, index) {
    const openai = new OpenAI("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"); // Replace with your OpenAI API key

    // Generate the embedding for the user's query
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: queryText,
    });

    const queryEmbedding = response.data[0].embedding;

    // Query Pinecone for similar documents
    const queryResponse = await index.query({
        topK: 5, // Number of top similar documents to retrieve
        vector: queryEmbedding,
        includeMetadata: true, // Include metadata if needed
    });

    return queryResponse.matches;
}

// Handle a POST request to interact with the chatbot
export async function POST(req) {
    const openai = new OpenAI("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"); // Replace with your OpenAI API key
    const data = await req.json();

    const queryText = data[data.length - 1].content;

    // Get Pinecone index
    const index = await getIndex();

    // Retrieve relevant documents from Pinecone
    const relevantDocs = await retrieveRelevantDocuments(queryText, index);

    // Combine relevant documents into the conversation context
    const completion = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            ...data,
            ...relevantDocs.map(doc => ({
                role: 'assistant', 
                content: doc.metadata.text || 'Here is some relevant information based on your query.'
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
const index = await getIndex(); // Ensure you call getIndex to get the Pinecone index
await storeDocumentEmbedding(documentText, documentId, index);
