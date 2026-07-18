# OCRParse

A modern OCR (Optical Character Recognition) dashboard application that extracts structured data from invoices, receipts, and documents.

## Features

- 📄 **OCR Processing** - Extract text from invoices, receipts, and documents
- 🏢 **Workspace Management** - Organize documents by workspaces
- 👥 **User Management** - Support for Individual Freelancers, Company Users, and Company Owners
- 🌍 **Multi-language** - English, Dutch, and German support
- 📊 **Analytics Dashboard** - View processing statistics and recent activity
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **State Management**: TanStack React Query, Zustand
- **Internationalization**: next-intl
- **Authentication**: JWT with automatic token refresh

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Add your API URL and other configuration
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## User Types

- **Individual Freelancer** - Can create and manage personal workspaces
- **Company User** - Access to assigned company workspaces
- **Company Owner** - Full workspace management and user assignment

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/[locale]/          # Next.js App Router with i18n
├── components/            # React components
│   ├── App/              # Application components
│   └── Home/             # Landing page components
├── lib/                  # Utilities and configurations
│   ├── api/              # API client and endpoints
│   ├── auth/             # Authentication system
│   └── hooks/            # Custom React hooks
└── i18n/                 # Internationalization setup
```

## License

MIT
