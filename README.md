# Multi-Source Translator

## Description
Multi-Source Translator is a Chrome extension that provides quick and easy translations from multiple sources. It supports translation between English, Chinese (Simplified), and Japanese, with phonetic support for Japanese.

## Features
- Translate selected text using Google Translate, DeepL, and MyMemory
- Support for English, Chinese (Simplified), and Japanese
- Phonetic support (katakana conversion) for Japanese text
- Text-to-speech functionality for both original and translated text
- Quick translation icon that appears near selected text
- Context menu integration for easy access

## Installation
1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory containing the extension files

## Usage
1. Select text on any webpage
2. Click the translation icon that appears, or use the context menu option
3. View translations from multiple sources in a tooltip
4. Use the language selector to change the target language
5. Click the speaker icon to hear the text read aloud

## Configuration
API keys and other configuration settings can be found in `config.js`. Make sure to replace the placeholder API keys with your own before using the extension.

## Files
- `manifest.json`: Extension configuration
- `background.js`: Background script for handling context menu and message passing
- `content.js`: Content script for UI and translation logic
- `config.js`: Configuration file for API keys and settings
- `styles.css`: Stylesheet for the translation tooltip
- `popup.html`: Popup UI for the extension

## Dependencies
- Google Translate API (no key required)
- DeepL API (free and pro versions supported)
- MyMemory Translation API
- Goo Labs API (for Japanese katakana conversion)

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.