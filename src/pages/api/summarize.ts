import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChunkResponse {
  topics: Array<{
    id: string;
    title: string;
    summary: Array<{
      point: string;
      transcriptSection: string;
    }>;
  }>;
}

const messages = [
  {
    role: "system",
    content: "You are an expert at analyzing lecture transcripts. Your task is to identify main topics and create detailed bullet point summaries for each topic to help students review the lecture content. Be thorough in identifying distinct topics and provide comprehensive bullet points for each topic. Always respond with valid JSON."
  },
  {
    role: "user",
    content: (transcript: string) => `Analyze this lecture transcript and identify ALL main topics discussed (Exhaustive, and in the order they are discussed). For each topic:
    1. Create a clear, concise title
    2. Provide 5-8 (depending on the length of the topic) detailed bullet points that capture the key concepts, examples, and important details
    3. Ensure bullet points are specific and informative
    4. For each bullet point, identify the relevant section of the transcript that contains the detailed discussion of that point
    
    Return the result as JSON with the following structure:
    {
      "topics": [
        {
          "id": "topic-id",
          "title": "Topic Title",
          "summary": [
            {
              "point": "Detailed bullet point 1",
              "transcriptSection": "The relevant section of the transcript that discusses this point in detail"
            },
            {
              "point": "Detailed bullet point 2",
              "transcriptSection": "The relevant section of the transcript that discusses this point in detail"
            },
            ...
          ]
        }
      ]
    }
    
    Guidelines for topic identification:
    - Include both major themes and important technical details
    - Consider chronological progression of concepts
    - Capture any important examples or case studies as separate topics if they illustrate key concepts
    - For each bullet point, extract the most relevant section of the transcript that provides the detailed discussion of that point
    - Make sure the transcript sections are well-formatted and easy to read

    Transcript:\n${transcript}`
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ message: 'Invalid transcript provided' });
    }

    console.log('Sending request to OpenAI');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        messages[0],
        { role: "user", content: messages[1].content(transcript) }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    console.log('Raw OpenAI response:', content);

    let parsedResponse: ChunkResponse;
    try {
      parsedResponse = JSON.parse(content);
      console.log('Parsed response:', parsedResponse);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    if (!parsedResponse.topics || !Array.isArray(parsedResponse.topics)) {
      throw new Error('Invalid response format from OpenAI');
    }

    return res.status(200).json(parsedResponse);

  } catch (error) {
    console.error('OpenAI API error:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Error processing request'
    });
  }
}
