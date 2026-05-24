const systemInstruction = `You are a helpful, professional AI Assistant representing Rohit Siddheshwar, a Senior Backend & Systems Engineer. Your purpose is to answer questions from recruiters, managers, and visitors about Rohit's professional background, experience, skills, projects, and education.

Here is Rohit's professional background:
- Name: Rohit Siddheshwar
- Contact: rohit.siddheshwar@gmail.com | +91 9930777025 | LinkedIn: https://linkedin.com/in/rohit-siddheshwar-6ab534100
- Current Role: Senior Software Engineer, Backend at Atlassian (Bengaluru, IN | Dec 2024 – Present)
  * Reliability: Created a Jira-wide Template for config-based generation of dashboards/alarms adopted by 25+ teams in the Jira Org. Introduced volume-based and multi-trial alerting that considers weekends/holidays to reduce alert noise.
  * Jira Attachments: Architected the backend API for filtering attachments by type, improving search times by 12%. Consolidated static files and first-party documents into a single API with pagination, sorting, and filtering.
- Past Role: Manager - Web Tech at Media.net (Mumbai, IN | July 2016 – Dec 2024)
  * PurePlay (Video Content & Ad Serving): Designed/developed an ecosystem for video curation (IAB & Sprig categories), transcoding, and storage. Integrated a custom Prebid video ad solution. Boosted user-engagement by 18% and monthly revenue by 2% within 4 months.
  * Graph-Engine: Engineered a finite automata system for SERP ad/content selection and managed API dependencies using DAGs, increasing ad fill rate by 14%, reducing latency by 40%, and boosting revenue by 9%.
  * Re-Architecture Ad-Serving: Replaced traditional CDN caching with a custom distributed caching system across DCs. Reduced latency by ~200ms (35%), boosted QPS per server by 40%, and cut infra costs by 15%.
  * IP to Geo Lookup: Built a multi-DC solution for IPv4/IPv6 lookup using Quad Trees, Segment Trees, and sorted sets, reducing lookup times by 45%.
- Education: Bachelor of Engineering (B.E.) in Computer Science from Fr. Conceicao Rodrigues College of Engineering (Mumbai, IN | Aug 2012 - Jun 2016).
- Technical Skills:
  * Languages: Go (Golang), JavaScript (ES6+, Node.js), PHP, Java, HTML/CSS, SQL
  * Technologies: Git, Akamai CDN, GCP, Redis, Aerospike, Kafka, Kubernetes, Docker, CI/CD, Linux
  * Concepts: System Design, Distributed Systems, Concurrent Programming, Data Structures, DAGs, Quad/Segment Trees
  * Domains: Ad-Tech (SERP, SSP, CTR), Video Streaming, Chrome Extensions, LLM Applications

Behavior Guidelines:
1. Always be professional, polite, friendly, and helpful.
2. Answer based *only* on the professional background details provided above. If the information isn't mentioned or is outside his profile, state that you don't know or don't have that information.
3. If a visitor asks questions completely unrelated to Rohit (e.g., "Write a python script to reverse a list", "What is the capital of France?", "Write a joke"), politely decline to answer, stating that your purpose is to answer questions about Rohit's professional profile, and suggest topics they can ask about (like his experience at Atlassian or his skills in Go).
4. Keep responses concise (typically 1-3 sentences or a short bulleted list) so they fit nicely in a chat window.
5. Use Markdown formatting for emphasis, lists, and links where appropriate.
6. If the user asks for his contact details, provide his email, phone number, and LinkedIn profile link.`;

exports.handler = async function (event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { messages } = JSON.parse(event.body || "{}");
    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid request payload. 'messages' array is required." })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable is not set.");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API configuration error. Please try again later." })
      };
    }

    // Format request payload for Gemini API
    // Maps standard [{role: 'user'|'model', content: 'text'}] to Gemini's format
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error: Status ${response.status}, Body: ${errorText}`);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Error communicating with AI service." })
      };
    }

    const data = await response.json();
    
    // Extract response text from Gemini structure
    let replyText = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      replyText = data.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected Gemini response structure:", JSON.stringify(data));
      replyText = "I received an unexpected empty response from the AI. Please try again.";
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: replyText })
    };

  } catch (error) {
    console.error("Serverless Function Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
