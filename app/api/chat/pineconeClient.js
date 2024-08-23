import { PineconeClient } from '@pinecone-database/pinecone';

let index;

async function initPinecone() {
    const pinecone = new PineconeClient();
    await pinecone.init({
        apiKey: process.env.PINECONE_API_KEY, // Use environment variable
        environment: "us-east-1", // replace with your actual environment
    });
    index = pinecone.Index("custosuppo-ai");
}

async function getIndex() {
    if (!index) {
        await initPinecone();
    }
    return index;
}

export { getIndex };
