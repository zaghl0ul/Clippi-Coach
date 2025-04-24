# Google Gemini Integration for Slippi Coach

This document provides specific instructions for setting up and using the Google Gemini API with Slippi Coach.

## Getting Started with Gemini

### 1. Get a Google API Key with Gemini Access

1. Go to the [Google AI Studio](https://ai.google.dev/)
2. Create an account or sign in with your existing Google account
3. Click on "Get API key" in the top-right corner
4. Create a new API key (or use an existing one)
5. Make sure your API key has access to the Gemini models

### 2. Configure Slippi Coach for Gemini

#### Option A: Using the Setup Script
Run the setup script and choose Option 4 (Google Gemini):
```
node setup-local-llm.js
```

#### Option B: Manual Setup
Add these lines to your `.env` file:
```
API_KEY=your_google_api_key_here
GEMINI_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-pro
```

### 3. Available Models

The following models are supported:
- `gemini-pro` (default) - General purpose model
- `gemini-1.5-flash` - Faster, more efficient model
- `gemini-1.5-pro` - More capable model for complex tasks

## Troubleshooting

If you encounter 404 errors with "model not found", ensure:
1. You're using a model name that exists in the v1beta API
2. Your API key has access to the Gemini API
3. Check the [Google AI documentation](https://ai.google.dev/docs) for the most current model names

## Testing Your Configuration

Run the test script to verify your Gemini setup:
```
node test-gemini-beta.js
```

This will test if your API key works and if you can properly connect to the Gemini API.

## Quota and Usage

- Google Gemini API has usage quotas that may limit your usage
- Check your quota in the [Google AI Platform console](https://ai.google.dev/)
- Quota limits are typically refreshed daily

For more information, visit the [Google AI Platform documentation](https://ai.google.dev/docs).