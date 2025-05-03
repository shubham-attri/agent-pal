# Agent Pal

Agent Pal is a desktop chat application that integrates with LM Studio to provide a local AI assistant experience similar to ChatGPT, but running entirely on your own machine.

## Features

- Full-screen chat interface similar to ChatGPT
- Integration with local LLMs through LM Studio
- Conversation history
- Light/dark mode support
- System tray access

## Setup

### Prerequisites

1. [LM Studio](https://lmstudio.ai/) installed on your computer
2. Node.js and npm installed
3. Electron for desktop app capabilities

### Installation

1. Clone this repository
```
git clone https://github.com/yourusername/agent-pal.git
cd agent-pal
```

2. Install dependencies
```
npm install
```

3. Build the application
```
npm run build
```

4. Start the application
```
npm start
```

### Setting up LM Studio

1. Open LM Studio
2. Load the qwen3-4b model or another model of your choice
3. Go to "Local Server" tab and start the server
4. Make sure the server is running at http://127.0.0.1:1234 (or update the endpoint in `src/config.ts`)

## Usage

1. Launch Agent Pal
2. The main chat interface will open automatically
3. Type your message and press Enter or click the send button
4. The AI will respond based on the model loaded in LM Studio

## Configuration

You can adjust the application settings in `src/config.ts`:

```typescript
// API endpoint for LM Studio
apiUrl: 'http://127.0.0.1:1234',

// Model to use
model: 'qwen3-4b',

// System prompt for the AI
systemPrompt: 'You are a helpful AI assistant called Agent Pal...'
```

## Development

### Project Structure

- `src/` - Source code
  - `main.ts` - Main Electron process
  - `preload.ts` - Preload script for Electron
  - `renderer.ts` - Renderer process code
  - `services/` - Service modules
    - `ai-service.ts` - LM Studio API integration
  - `ui/` - UI components and styles
    - `components/` - UI component classes
    - `styles/` - CSS styles
  - `types.ts` - TypeScript type definitions
  - `config.ts` - Application configuration

### Building

```
npm run build
```

### Running in Development Mode

```
npm run dev
```

## License

[MIT License](LICENSE) 