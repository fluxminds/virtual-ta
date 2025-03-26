export interface TopicChunk {
  id: string;           // Unique identifier for the topic
  title: string;        // Topic title
  summary: Array<{
    point: string;      // The bullet point text
    transcriptSection: string; // The relevant transcript section
  }>;
}
