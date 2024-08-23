// pineconeClient.js
import { PineconeClient } from '@pinecone-database/pinecone';

let index;

async function initPinecone() {
    const pinecone = new PineconeClient();
    await pinecone.init({
        apiKey: "da69eb63-3b78-4563-84af-249c2ba684f6", // replace with your actual API key
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

module.exports = { getIndex };

