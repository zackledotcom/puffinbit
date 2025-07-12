# Puffer AI Assistant Setup Guide

## 🚀 Quick Start

Your Puffer AI Assistant is now ready! This application provides a local AI assistant powered by Ollama (for AI models) and ChromaDB (for conversation memory and RAG).

## 📋 Prerequisites

Before using the AI Assistant, you need to install the required services:

### 1. Install Ollama

**macOS/Linux:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from: https://ollama.com/download

**Verify Installation:**

```bash
ollama --version
```

### 2. Install ChromaDB

```bash
pip install chromadb
```

**Verify Installation:**

```bash
chroma --version
```

## 🎯 Usage

1. **Start the Application:**

   ```bash
   npm run dev
   ```

2. **Service Setup:**

   - The app will check if Ollama and ChromaDB are running
   - If not running, use the "Start" buttons in the interface
   - For first-time use, you'll need to pull an AI model (like llama2)

3. **First AI Model:**
   - Click "Pull Default Model (llama2)" when prompted
   - This downloads a 4GB model, so ensure good internet connection
   - Alternative models: llama2:7b, codellama, mistral

## ⚙️ Features

### ✅ Service Management

- **Auto-detection** of Ollama and ChromaDB services
- **One-click startup** for services
- **Real-time status** indicators

### 🤖 AI Chat

- **Multiple model support** (switch between downloaded models)
- **Conversation memory** via ChromaDB integration
- **Context-aware responses** using chat history
- **Export functionality** for chat logs

### 🧠 RAG (Retrieval-Augmented Generation)

- **Automatic storage** of conversations in ChromaDB
- **Context search** for better responses
- **Persistent memory** across sessions

## 🔧 Troubleshooting

### Ollama Issues

- **"Failed to connect"**: Ensure Ollama is installed and in PATH
- **"No models available"**: Run `ollama pull llama2` in terminal
- **Port conflicts**: Ollama runs on port 11434 by default

### ChromaDB Issues

- **"ChromaDB not responding"**: Check if port 8000 is available
- **Installation errors**: Ensure Python 3.8+ is installed
- **Permission issues**: Run with appropriate permissions

### Common Commands

```bash
# Manual Ollama commands
ollama serve                    # Start Ollama service
ollama pull llama2             # Download llama2 model
ollama list                    # List installed models

# Manual ChromaDB commands
chroma run --host localhost --port 8000    # Start ChromaDB
```

## 🏗️ Development

### Build Commands

```bash
npm run dev          # Development mode
npm run build        # Production build
npm run start        # Start built app
```

### Project Structure

```
src/
├── main/           # Electron main process
├── preload/        # IPC bridge
└── renderer/       # Vue.js frontend
    └── components/
        └── AIAssistant.vue    # Main AI interface
```

## 🎨 Customization

### Adding New Models

1. Download model: `ollama pull model-name`
2. Restart the application
3. Select from dropdown in interface

### Styling

- Modify `AIAssistant.vue` for UI changes
- Uses gradient background with glassmorphism effects
- Responsive design for different screen sizes

## 📊 Performance Tips

- **Model Selection**: Smaller models (7B) are faster than larger ones (13B, 70B)
- **Memory Usage**: ChromaDB stores all conversations locally
- **Network**: Initial model download requires good internet

## 🔒 Privacy

- **100% Local**: All AI processing happens on your machine
- **No Data Sharing**: Conversations never leave your device
- **Offline Capable**: Works without internet after setup

## 🐛 Known Issues

1. **First startup may be slow** while services initialize
2. **Large models require significant RAM** (8GB+ recommended)
3. **Windows users** may need to install Visual C++ redistributables

## 📞 Support

If you encounter issues:

1. Check the service status indicators in the app
2. Verify prerequisites are installed
3. Check console output for error details
4. Restart services if needed

---

**Happy Chatting with Puffer! 🕊️**
