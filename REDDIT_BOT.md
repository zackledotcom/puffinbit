# Reddit DM Bot Integration

## Overview

Puffer now includes a fully autonomous Reddit DM bot that can automatically respond to direct messages using AI.

## Features

- **Autonomous Operation**: Automatically polls for new DMs and responds without human intervention
- **AI-Powered Responses**: Uses your configured AI models (Ollama) with memory context
- **Rate Limiting**: Configurable limits to prevent spam (default: 10 replies/hour)
- **User Management**: Blacklist/whitelist functionality
- **Real-time Monitoring**: Live statistics and activity tracking
- **Manual Override**: Send manual replies when needed

## Setup Instructions

### 1. Create Reddit Application

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the form:
   - **Name**: Puffer Bot (or your preferred name)
   - **App type**: Select "script"
   - **Description**: AI-powered DM bot
   - **About URL**: Leave blank
   - **Redirect URI**: `http://localhost:8080` (required but not used)
4. Click "Create app"
5. Note down your **Client ID** (under the app name) and **Client Secret**

### 2. Get Refresh Token

You need to obtain a refresh token for your Reddit account:

**Option A: Use Reddit's OAuth2 flow** (Recommended)

```bash
# Install praw-oauth2-util or use online tools
# Follow Reddit OAuth2 documentation to get refresh token
```

**Option B: Manual method**

1. Use tools like Postman or curl to authenticate with Reddit OAuth2
2. Exchange authorization code for refresh token
3. Store the refresh token securely

### 3. Configure Puffer

1. Open Puffer
2. Navigate to the Reddit Bot panel
3. Enter your credentials:
   - **Client ID**: From step 1
   - **Client Secret**: From step 1
   - **Refresh Token**: From step 2
   - **User Agent**: `YourAppName:v1.0.0 (by /u/yourusername)`
4. Click "Connect to Reddit"

### 4. Configure Bot Behavior

- **Auto-Reply**: Enable/disable automatic responses
- **Poll Interval**: How often to check for new DMs (1-30 minutes)
- **Rate Limit**: Maximum replies per hour (1-50)
- **AI Model**: Which Ollama model to use for responses
- **System Prompt**: Instructions for the AI on how to respond

## Bot Behavior

### Automatic Operation

When enabled, the bot will:

1. Poll Reddit for new unread DMs every N minutes
2. Process each new DM through the AI model
3. Generate contextually appropriate responses
4. Send replies automatically
5. Mark messages as read
6. Log all activity for monitoring

### Safety Features

- **Rate limiting** prevents spam
- **User blacklisting** blocks problematic users
- **Error recovery** handles API failures gracefully
- **Memory integration** provides context-aware responses
- **Activity logging** tracks all bot actions

### Response Quality

The bot uses:

- Your configured AI model (Ollama)
- Memory summaries for context
- Custom system prompts for behavior
- Conversation history for continuity

## Monitoring

### Real-time Statistics

- Total DMs processed
- Total replies sent
- Current running status
- Error count and details
- Recent activity log

### Activity Tracking

All bot actions are logged:

- DMs received
- Replies sent
- Users ignored (blacklisted)
- Errors encountered
- Configuration changes

## Manual Controls

### Send Manual Replies

- Override the bot to send custom messages
- Useful for important conversations
- Still respects rate limits

### Start/Stop Agent

- Full control over bot operation
- Immediate start/stop without losing configuration
- Safe shutdown handles ongoing operations

## Security Considerations

### Credentials Storage

- Reddit credentials are stored securely
- Refresh tokens are encrypted at rest
- No plaintext credential storage

### Bot Behavior

- **No content moderation** - The bot responds to ALL messages when enabled
- **Autonomous operation** - No approval process for responses
- **Rate limited** - Prevents overwhelming users or Reddit API
- **Blacklist protection** - Block problematic users manually

### Privacy

- All DM content is processed locally through Ollama
- No data sent to external services (except Reddit API)
- Memory system stores conversation summaries only
- Activity logs can be exported or cleared

## Troubleshooting

### Common Issues

1. **Authentication Fails**

   - Verify Client ID and Secret are correct
   - Ensure refresh token is valid and not expired
   - Check User Agent format

2. **Bot Not Responding**

   - Verify Ollama is running and models are available
   - Check if rate limits are exceeded
   - Review error logs in the activity panel

3. **API Rate Limits**
   - Reddit API has rate limits (60 requests/minute)
   - Bot automatically handles these with backoff
   - Reduce poll frequency if hitting limits

### Debug Information

- Enable debug mode in agent configuration
- Check system diagnostics panel
- Review telemetry logs for detailed error information
- Use manual reply testing to verify connectivity

## Legal and Ethical Considerations

### Reddit Terms of Service

- Ensure your bot complies with Reddit's API terms
- Respect user privacy and consent
- Don't use the bot for spam or harassment
- Follow Reddit's content policy

### Best Practices

- Set reasonable rate limits
- Use clear, helpful responses
- Respect user requests to stop
- Monitor bot behavior regularly
- Have a way to quickly disable the bot if needed

## API Reference

The Reddit bot exposes these IPC endpoints:

- `reddit:authenticate` - Connect to Reddit
- `reddit:list_dms` - Get DM list
- `reddit:send_dm` - Send direct message
- `reddit-agent:start` - Start the bot
- `reddit-agent:stop` - Stop the bot
- `reddit-agent:get_stats` - Get performance statistics

See the preload API definitions for complete method signatures.
