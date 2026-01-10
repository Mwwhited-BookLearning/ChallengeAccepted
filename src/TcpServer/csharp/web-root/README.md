# PostMessage Proxy Demo

A simple demo project showcasing cross-window communication using the PostMessageProxy library.

## Project Structure

```
www/
├── index.html           # Main launcher page
├── client-1.html        # Client 1 (purple theme)
├── client-2.html        # Client 2 (pink theme)
├── client-3.html        # Client 3 (blue theme)
├── scripts/
│   ├── PostMessageProxy.js  # Core proxy library
│   ├── Tools.js             # Utility functions
│   └── promise-7.0.4.js     # Promise polyfill
└── README.md
```

## How to Run

1. Start a local web server in the `www` directory:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000

   # Using Node.js http-server
   npx http-server -p 8000

   # Using PHP
   php -S localhost:8000
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

3. Click the buttons to open client windows

## How It Works

- Each client window runs independently in a separate browser window/popup
- Clients communicate with each other using the HTML5 `postMessage` API
- The PostMessageProxy library handles:
  - Message routing between named clients
  - Promise-based request/response patterns
  - Window lifecycle management
  - Automatic connection tracking

## Features Demonstrated

- **Send Messages**: Send custom messages to specific clients
- **Broadcast**: Send messages to all connected clients
- **Ready Notifications**: Notify other clients when ready
- **Response Handling**: Receive and display responses from other clients
- **Real-time Logging**: See all communication in the message log

## Usage

1. Open multiple client windows using the launcher
2. Type a message in any client's input field
3. Click "Send to Client X" to send to a specific client
4. Click "Broadcast to All" to send to all clients
5. Watch the message logs to see the communication flow
6. Check browser console for detailed logging

## Notes

- Clients must be opened from the same origin (domain/port)
- Each client can open other clients automatically if they're not already running
- Communication is asynchronous and uses Promises
- All messages are logged both in the UI and browser console
