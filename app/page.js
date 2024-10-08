'use client';

import { Box, Stack, TextField, Button } from "@mui/material";
import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Howdy! I am the Custosuppo-Ai Support Agent, how can I assist you today?`,
  }]);

  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    // Add user message to the chat
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    try {
      // Send the message to the server
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      // Process the streamed response
      const processText = async ({ done, value }) => {
        if (done) {
          setMessages((messages) => {
            let lastMessage = messages[messages.length - 1];
            let otherMessages = messages.slice(0, messages.length - 1);
            return [
              ...otherMessages,
              {
                ...lastMessage,
                content: lastMessage.content + result,
              }
            ];
          });
          return;
        }

        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        result += text;

        // Continue reading
        reader.read().then(processText);
      };

      // Start processing the response
      reader.read().then(processText);

    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally handle the error by notifying the user
    } finally {
      // Clear the input field
      setMessage('');
    }
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      
      backgroundColor ="#f0f0f0"
     
      
    >
       <Image
        src="/Logo.png" // Assuming logo.png is in the public directory
        alt="Custosuppo AI Logo"
        width={400} // Adjust width as needed
        height={300} // Adjust height as needed
        //style={{ marginBottom: '0px' }} // Add some space below the logo
      />
      <Stack
        direction="column"
        width="600px"
        height="700px"
        border="1px solid black"
        p={2}
        spacing={3}
      >
     
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={message.role === 'assistant' ? 'flex-start' : 'flex-end'}
            >
              <Box
                bgcolor={message.role === 'assistant' ? 'primary.main' : 'secondary.main'}
                color="white"
                borderRadius={16}
                p={3}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant="contained" onClick={sendMessage}>Send</Button>
        </Stack>
      </Stack>
      <Box
        component="footer"
        width="100%"
        textAlign="center"
        mt={2}
        p={2}
        bgcolor="#333" // Dark background for footer
        color="white"
      >
        All rights reserved. Made by Vital Kyungu
      </Box>
    </Box>
  );
}
