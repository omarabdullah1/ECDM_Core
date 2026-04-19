# Executive Summary  
I will show how to integrate a system prompt into **ECDM_Core**’s backend, including session memory and logs, and connect it to VSCode/Antigravity tools. This involves creating a prompt file, adding TypeScript utilities, modifying API routes, and setting up logging to file, SQLite, and VSCode. Security best practices and testing steps are included. Where repo details are unclear, I note assumptions.  

## Adding the System Prompt and Session Cache  

First, place the prompt text in a new Markdown file and load it from code. For example:  

1. **Create folders:** Under `ecdm-core-backend/src`, make a folder `agent/` and a file `agent/SYSTEM_PROMPT_EN.md`. Also create `.vscode/agent/` if needed for VSCode hooks (optional).  

2. **Write the prompt file:** In `SYSTEM_PROMPT_EN.md`, put the exact English instructions for the assistant, e.g.:  
   ```markdown
   You are a technical assistant specialized in the ECDM Core ERP/CRM system. Communicate in English and provide clear, accurate guidance on topics like customers, products, and orders. Use professional technical language. Maintain a session memory of prior steps. Never reveal secrets (e.g. JWT or DB credentials) in your answers.
   ```  

3. **Agent util file:** Create `ecdm-core-backend/src/utils/agent.ts` (if it doesn’t exist). Add code to load the MD file and manage session cache. Example diff:  

   ```diff
   + // File: ecdm-core-backend/src/utils/agent.ts
   + import * as fs from 'fs';
   + import * as path from 'path';
   +
   + // 1) Load system prompt from Markdown file
   + export const SYSTEM_PROMPT_EN = fs.readFileSync(
   +   path.join(__dirname, '../agent/SYSTEM_PROMPT_EN.md'),
   +   'utf-8'
   + );
   +
   + // 2) Per-session memory cache
   + interface CacheEntry { user: string; assistant: string; }
   + export const sessionCache: Map<string, CacheEntry[]> = new Map();
   +
   + /** Add a step to the session cache */
   + export function addSessionStep(sessionId: string, userMsg: string, assistantMsg: string) {
   +   const history = sessionCache.get(sessionId) || [];
   +   history.push({ user: userMsg, assistant: assistantMsg });
   +   // Eviction: keep last 50 messages
   +   if (history.length > 50) history.shift();
   +   sessionCache.set(sessionId, history);
   + }
   +
   + /** Get full session history */
   + export function getSessionHistory(sessionId: string): CacheEntry[] {
   +   return sessionCache.get(sessionId) || [];
   + }
   ```

4. **.env and .gitignore:** Ensure any new files (`SYSTEM_PROMPT_EN.md`, log files, SQLite DB) are tracked or added to `.gitignore` as appropriate. For example, add `session_log.txt` and `*.db` to `.gitignore`.

## Calling the LLM from an API Route  

Next, modify or add an Express route to use the system prompt. For example, create `ecdm-core-backend/src/routes/agentRoute.ts`:

```diff
+ import express from 'express';
+ import { SYSTEM_PROMPT_EN, addSessionStep, getSessionHistory } from '../utils/agent';
+ // Example OpenAI client (install openai or similar)
+ import { OpenAIApi, Configuration } from 'openai';
+
+ const router = express.Router();
+ const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
+
+ router.post('/agent', async (req, res) => {
+   // Session ID (e.g. from express-session or custom header)
+   const sessionId = req.sessionID || req.headers['x-session-id'] as string || 'default';
+   const userQuestion = req.body.question;
+   if (!userQuestion) {
+     return res.status(400).json({ error: 'question is required' });
+   }
+
+   // Add user question to memory (assistantMsg blank for now)
+   addSessionStep(sessionId, userQuestion, '');
+
+   // Prepare prompt with history (simple concatenation example)
+   const history = getSessionHistory(sessionId);
+   const historyText = history.map(h => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n');
+   const prompt = `${SYSTEM_PROMPT_EN}\n\n${historyText}\nUser: ${userQuestion}\nAssistant:`;
+
+   // Call OpenAI (or other LLM) with prompt
+   const completion = await openai.createCompletion({
+     model: 'text-davinci-003',
+     prompt,
+     max_tokens: 500,
+     temperature: 0.2,
+   });
+   const assistantAnswer = completion.data.choices[0].text?.trim() || '';
+
+   // Add assistant answer to memory
+   addSessionStep(sessionId, userQuestion, assistantAnswer);
+
+   res.json({ answer: assistantAnswer });
+ });
+
+ export default router;
```

Notes:  
- We read `SYSTEM_PROMPT_EN` from the Markdown file.  
- We use `sessionId` from `req.sessionID` (assuming `express-session` is set up) or an `x-session-id` header.  
- **History serialization:** We simply concatenate prior Q/A. For large history, apply LRU or trim to fit token limit (Eviction above shows 50-entry limit).  
- **OpenAI example:** Replace with actual client calls; here `text-davinci-003` is an example model.  

## Persistence of Session Logs  

We log each step in three ways:

- **(a) Local File:** In the route above, after obtaining `assistantAnswer`, append to a file:
  ```ts
  import * as fs from 'fs';
  // After computing assistantAnswer:
  fs.appendFileSync('session_log.txt',
    `${sessionId} | Q: ${userQuestion} | A: ${assistantAnswer}\n`);
  ```
  This writes a line per interaction in `session_log.txt` (ensure `.gitignore` includes this file).

- **(b) SQLite:** Install a SQLite library (e.g. `sqlite3`). Initialize DB:
  ```ts
  import sqlite3 from 'sqlite3';
  const db = new sqlite3.Database('session_logs.db');
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    sessionId TEXT, userMsg TEXT, assistantMsg TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // In route, instead of fs.append:
  db.run(
    `INSERT INTO logs (sessionId, userMsg, assistantMsg) VALUES (?, ?, ?)`,
    [sessionId, userQuestion, assistantAnswer]
  );
  ```
  This stores structured logs. Adjust queries as needed.

- **(c) VSCode Copilot / Antigravity:**  
  - **Copilot Chat Memory:** VSCode’s Copilot Chat has a local “Memory tool” and cloud “Copilot Memory”【100†L51-L59】. You can enable Copilot memory in settings to automatically save context. Our backend doesn’t need code changes for this; it reads the `session_log.txt` if opened.  
  - **Agent Memory Extensions:** Extensions like *Agent Memory* or *AI Memory* (VSCode Marketplace) can use a workspace file. To hook into Antigravity: if Antigravity doesn’t auto-read logs, instruct the user to open `session_log.txt` in Antigravity. No official Antigravity API is known, so this is a fallback.
  - **Integration Points:** Essentially, ensure `session_log.txt` or DB is accessible in the project. A user can use the VSCode “Open File” command or a built-in agent memory tool to view it. For Antigravity, we mark this as unspecified and default to using the log file.

## Security Considerations  

- **Never log secrets:** Do not write environment secrets (e.g. `JWT_SECRET`, `MONGODB_URI`) to any log or output【95†L386-L389】.  
- **Masking:** If user input may contain private info, sanitize or mask it before logging. For example:  
  ```ts
  const safeUserQuestion = userQuestion.replace(/(password|token)=\S+/gi, '$1=[REDACTED]');
  ```
- **Encryption:** To encrypt logs at rest, use Node’s crypto. Example using AES-GCM with a key from `.env`:
  ```ts
  import { createCipheriv, randomBytes } from 'crypto';
  const key = Buffer.from(process.env.LOG_ENCRYPTION_KEY!, 'hex'); // 32 bytes
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(`${sessionId}|${userQuestion}|${assistantAnswer}`, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  fs.appendFileSync('session_log.enc', `${iv.toString('hex')}|${tag}|${encrypted}\n`);
  ```
  Store `LOG_ENCRYPTION_KEY` in `.env` and list it in `.gitignore`. For decryption, use corresponding `decipher` steps.  
- **.gitignore:** Add at least:
  ```
  session_log.txt
  session_logs.db
  session_log.enc
  .env
  agent/SYSTEM_PROMPT_EN.md
  ```

## Testing and Rollout Plan  

**Testing:**  
- **Server run:**  
  ```bash
  cd ecdm-core-backend
  npm install
  npm run dev
  ```  
  Check console for errors.  
- **API test:**  
  ```bash
  curl -X POST http://localhost:5001/api/agent \
    -H "Content-Type: application/json" \
    -H "x-session-id: TEST123" \
    -d '{"question":"Hello"}'
  ```  
  Expect a JSON response with `"answer": ...`.  
- **Session continuity:** Call twice with same `x-session-id`:
  ```
  curl -X POST ... -H "x-session-id: S1" -d '{"question":"First"}'
  curl -X POST ... -H "x-session-id: S1" -d '{"question":"Second"}'
  ```
  Verify `session_log.txt` (or DB) shows both interactions under `S1`.  
- **Eviction check:** Send >50 messages in one session; ensure earlier messages are dropped (count lines in `session_log.txt` or inspect `sessionCache`).  
- **Log integrity:** Ensure nothing in logs looks like a secret (test by sending fake JWT string and checking logs).  
- **Persistence:** For SQLite, query the `logs` table to see entries. For encrypted logs, test decryption logic.  

**Rollout:**  
1. **Dev environment:** Deploy to a dev server. Use a dev DB (if separate) and run integration tests.  
2. **Staging:** Merge to staging. Use `npm run build` and run prod server. Test with sample CURL and maybe a mock frontend.  
3. **Production:** Finally, deploy to production. Ensure `.env` is set (OpenAI key, encryption key, etc.). After deployment, monitor logs for errors. Use a small percentage of traffic (if applicable) before full switchover.

## English System Prompt and Loading  

As requested, we save the prompt in a Markdown file **and** as a constant. We already saw `SYSTEM_PROMPT_EN.md`. Alternatively, define it in code:

```diff
+ // Option 2: As a constant in agent.ts
+ export const SYSTEM_PROMPT_EN_CONST = `
+ You are a technical assistant specialized in the ECDM Core ERP/CRM system. Communicate in English and provide clear, accurate guidance on features like customers, products, and orders. Use professional technical language and maintain a conversation history. Never reveal confidential information (such as JWT or database credentials) in your responses.
+ `;
```

Then in the API code, you could use either `SYSTEM_PROMPT_EN` (from MD file) or `SYSTEM_PROMPT_EN_CONST`. The above shows both approaches. The MD file is loaded at runtime (as in **agent.ts** code above), and the constant is hard-coded.

## Integration Diagrams  

```mermaid
flowchart TD
    subgraph User-Agent Flow
        U[User] -->|POST /api/agent| API[Express API Route];
        API -->|Inject prompt + history| LLM[LLM (OpenAI)];
        LLM -->|Answer| API;
        API -->|Return response| U;
        API -->|Log Step| FILE[Local File or DB];
    end

    subgraph VSCode Integration
        FILE --> Copilot["Copilot Memory Tool"];
        FILE --> VSCode["VSCode Editor"];
        Click VSCode "session_log.txt open";
    end
```

This flow shows the user posting a question, the backend API calling the LLM with the system prompt and session history, and the answer returning. Each step is logged to `session_log.txt` or the database. VSCode’s Copilot can optionally access the log file (as shown).

## VSCode Tasks/Launch and Log Viewing  

Add these `.vscode` config snippets:

- **tasks.json** to run the backend:
  ```json
  {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Run Backend",
        "type": "npm",
        "script": "dev",
        "path": "ecdm-core-backend",
        "problemMatcher": []
      }
    ]
  }
  ```
- **launch.json** to debug:
  ```json
  {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Debug Backend",
        "type": "node",
        "request": "launch",
        "cwd": "${workspaceFolder}/ecdm-core-backend",
        "program": "${workspaceFolder}/ecdm-core-backend/src/server.ts",
        "preLaunchTask": "Run Backend"
      }
    ]
  }
  ```

To view logs, I recommend opening `ecdm-core-backend/session_log.txt` in the editor. As an example, a VSCode task could be:

```json
{
  "label": "Open Session Log",
  "type": "shell",
  "command": "code ../ecdm-core-backend/session_log.txt",
  "problemMatcher": []
}
```

Alternatively, using the **Agent Memory** VSCode extension can manage this file as agent context.

## Assumptions and Unspecified Details  

- **Backend Path:** I assume backend code is in `ecdm-core-backend/src`. If different, adjust paths.  
- **Session ID:** I used `express-session` or an `x-session-id` header. If neither, a custom ID generator is needed.  
- **LLM Client:** Example uses OpenAI’s Node SDK. You can replace with any AI client.  
- **Antigravity:** No public integration docs were found. I treat it like VSCode; otherwise, use the log file fallback.  
- **Python/Other Stacks:** This guide assumes a Node/TypeScript backend.  

Sources: The ECDM_Core README (for file structure and env names【95†L386-L389】) and VSCode documentation on agent memory【100†L51-L59】 informed parts of this guide. All other code and steps are based on standard Node.js/Express and VSCode practices.