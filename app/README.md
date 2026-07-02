# ULSESA - University of Lagos Science Education Students' Association

A premium online voting platform built for transparent, secure, and accessible student elections.

## Features

- **AI-Powered Verification** - Document verification using OpenAI Vision API
- **Cryptographic Voting** - SHA-256 hashed votes with verifiable receipts
- **Real-Time Results** - Live election results with auto-refresh
- **Membership System** - Digital membership cards with QR codes
- **Premium UI/UX** - Glass morphism design with smooth animations

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: Turso (libSQL) - SQLite at the edge
- **Auth**: JWT with bcrypt password hashing
- **File Storage**: Cloudinary
- **Email**: Nodemailer (SMTP)
- **AI**: OpenAI GPT-4 Vision

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Turso database (or local SQLite)
- OpenAI API key
- Cloudinary account
- SMTP email account

### Installation

```bash
# Clone the repository
git clone https://github.com/Heisdawrld/ULSESA-.git
cd ULSESA-/app

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your credentials
# - TURSO_DATABASE_URL
# - TURSO_AUTH_TOKEN
# - OPENAI_API_KEY
# - CLOUDINARY_* credentials
# - SMTP_* credentials
# - JWT_SECRET
# - VOTE_SECRET

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

```env
# Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Authentication
JWT_SECRET=your-super-secret-jwt-key
VOTE_SECRET=your-vote-secret-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Deployment

### Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `cd app && pnpm install && pnpm build`
4. Set start command: `cd app && pnpm start`
5. Add environment variables from `.env.example`

### Database Setup

1. Create a Turso database at [turso.tech](https://turso.tech)
2. Get the database URL and auth token
3. Add them to your Render environment variables
4. Run `pnpm db:push` to create tables

## Project Structure

```
app/
├── app/                    # Next.js App Router
│   ├── api/              # API Routes
│   │   ├── admin/        # Admin endpoints
│   │   ├── auth/         # Authentication
│   │   ├── elections/    # Election management
│   │   ├── members/      # Member management
│   │   └── vote/         # Voting endpoints
│   ├── admin/            # Admin pages
│   ├── dashboard/         # Member dashboard
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── vote/             # Voting pages
├── components/            # React components
├── lib/                   # Utility functions
│   ├── ai-verification.ts
│   ├── db-push.ts       # Database migrations
│   ├── email.ts
│   ├── storage.ts
│   └── voting.ts
└── public/               # Static assets
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Voting
- `POST /api/vote/cast` - Cast vote
- `GET /api/vote/results` - Get election results
- `GET /api/vote/verify` - Verify vote receipt

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/verification-queue` - Pending verifications
- `POST /api/admin/verification-queue` - Approve/reject user

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 7-day expiration
- Votes hashed with SHA-256
- Parameterized SQL queries (SQL injection prevention)
- Secure file upload validation

## License

MIT License - See LICENSE file for details.

## Author

Built with ❤️ for ULSESA by Heisdawrld

---

**© 2024 ULSESA. All rights reserved.**
