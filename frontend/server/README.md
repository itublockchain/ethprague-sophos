# Sagittarius Server

WebSocket server for Sagittarius chess betting platform with Yellow Network ERC-7824 (Nitrolite) integration.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template and configure
cp .env.template .env

# Start the server (production)
npm start

# Start the server with hot reload (development)
npm run dev
```

Server runs on port 8080 by default.

## Environment Configuration

Create a `.env` file in the server directory with the following variables:

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# Nitrolite Configuration
NITROLITE_NODE_URL=ws://localhost:9545
NITROLITE_RPC_URL=http://localhost:8545

# Blockchain Configuration
CHAIN_ID=137
USDC_TOKEN_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174

# Contract Addresses (Get these from Yellow Network)
CUSTODY_ADDRESS=0x...
ADJUDICATOR_ADDRESS=0x...

# Server Wallet (Generate a new private key for production!)
SERVER_PRIVATE_KEY=0x...

# Authentication
JWT_SECRET=your-secure-jwt-secret
```

## Architecture

### WebSocket Protocol

The server uses WebSocket for real-time communication with two main channels:

1. **Game WebSocket** - Handles game state, room management, and betting
2. **Nitrolite RPC** - Connects to Yellow Network's Nitrolite node for state channels

### Message Types

#### Client → Server

```js
// Place a bet
{
  "type": "placeBet",
  "payload": {
    "roomId": "game-id",
    "predictedMove": "e2e4",
    "amount": 10
  }
}

// Join a room
{
  "type": "joinRoom",
  "payload": {
    "roomId": "game-id",
    "address": "0x..."
  }
}
```

#### Server → Client

```js
// Bet placed confirmation
{
  "type": "bet:placed",
  "betId": "bet-uuid",
  "status": "pending"
}

// Bet result
{
  "type": "bet:resolved",
  "betId": "bet-uuid",
  "won": true,
  "payout": 20
}
```

### State Channel Flow

1. **Room Creation**: When players join, a state channel is prepared
2. **Game Start**: Multi-signature app session created with betting pool
3. **Bet Placement**: Off-chain state updates for each bet
4. **Bet Resolution**: Instant payouts through channel state updates
5. **Game End**: Channel closed with final settlement

## Development

### Project Structure

```
server/
├── src/
│   ├── config/         # Configuration files
│   ├── routes/         # WebSocket message handlers
│   ├── services/       # Business logic
│   │   ├── nitroliteRPC.js    # Nitrolite client
│   │   ├── roomManager.js     # Game room management
│   │   ├── bettingManager.js  # Betting logic
│   │   └── appSessions.js     # State channel sessions
│   ├── utils/          # Utilities
│   └── server.js       # Main server file
└── package.json
```

### Adding New Features

1. **New Message Type**: Add handler in `server.js` switch statement
2. **New Service**: Create in `services/` and initialize in `server.js`
3. **New Route**: Create in `routes/` for complex message handling

## Production Deployment

1. Generate a secure private key for the server
2. Set proper contract addresses from Yellow Network
3. Configure NITROLITE_NODE_URL to point to production node
4. Use a secure JWT_SECRET
5. Set NODE_ENV=production

## Testing

```bash
# Test WebSocket connection
npm install -g wscat
wscat -c ws://localhost:8080

# Send test message
> {"type":"ping"}
```

## Security Considerations

- Server acts as trusted arbiter with 100% quorum weight
- All bets are validated server-side
- State channel disputes handled through challenge period
- Private keys must be securely managed in production
