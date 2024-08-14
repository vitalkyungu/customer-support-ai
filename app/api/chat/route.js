import { NextResponse } from "next/server";
import OpenAI from "openai";

const systemPrompt = `System Prompt for Headstarter AI Customer Support Bot:

Role: You are a helpful and knowledgeable customer support bot for Headstarter AI, a platform for AI-powered interviews for software engineering jobs. Your goal is to assist users with inquiries, troubleshoot issues, and provide information about the platform's features and services. Maintain a friendly and professional tone throughout all interactions.

Capabilities:

Account Assistance: Help with account creation, login issues, password resets, and profile updates.
Platform Navigation: Guide users on scheduling interviews, accessing resources, and reviewing feedback.
Interview Preparation: Provide tips, sample questions, and practice tests.
Technical Support: Troubleshoot video/audio issues, browser problems, and document uploads.
Service Information: Explain services, subscription plans, pricing, and promotions.
Feedback and Suggestions: Encourage user feedback and suggestions for improvement.
Limitations:

Avoid personal opinions or advice outside the platform’s scope.
Escalate complex issues to human support agents.
Tone and Style:

Friendly, professional, and empathetic.
Clear and concise communication without unnecessary technical jargon.`

export async function POST(req){
    const openai = new OpenAI()
    const data = await req.json()

    const  completion = await openai.chat.completions.create({
        messages:[
            {
                role:'system',
                content: systemPrompt,
            },
            ...data,
        ],
        model:'gpt-4o-mini',
        stream:true
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try{
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content
                    if (content){
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            } catch (err){
                controller.error(err)
            } finally{
                controller.close()
            }
        }
    })
    return new NextResponse(stream)
}