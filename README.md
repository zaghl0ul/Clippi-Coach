# Slippi Coach

Slippi Coach is a JavaScript application designed to analyze and provide live coaching and commentary for Super Smash Bros. Melee matches recorded in Slippi format. By leveraging AI models, the application interprets game data and offers insights to enhance player performance.

## Features

- **Real-time Analysis**: Monitors Slippi files for changes and processes game data on-the-fly.
- **AI Coaching**: Utilizes AI models to generate tailored coaching advice based on match statistics and player performance.
- **Live Commentary**: Provides engaging commentary during gameplay, highlighting key moments and player actions.
- **Configurable**: Easily manage API keys and settings through a configuration manager.

## Project Structure

```
slippi-coach
├── src
│   ├── index.js            # Entry point of the application
│   ├── slippiProcessor.js   # Functions to read and interpret Slippi files
│   ├── aiCoaching.js        # API calls to AI models for coaching advice
│   ├── liveCommentary.js     # Generation of live commentary during gameplay
│   ├── utils
│   │   ├── configManager.js  # Manage configuration settings
│   │   ├── logger.js         # Logging functionality
│   │   └── slippiUtils.js    # Utility functions for Slippi data
├── package.json              # npm configuration file
├── .env                      # Environment variables
├── .gitignore                # Files to ignore by Git
└── README.md                 # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd slippi-coach
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your API keys and other configuration settings.

## Usage

To start the application, run:
```
npm start
```

The application will begin watching the specified Slippi file for changes and provide live coaching and commentary based on the match data.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.