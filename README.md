# Invoice Report - Electricity Invoice Processing

A web application for extracting and analyzing electricity invoice data from Romanian energy suppliers.

## Features

- **PDF Invoice Upload** - Drag & drop interface for uploading invoice files
- **Data Extraction** - Automatically extracts key information from electricity invoices
- **Data Visualization** - View invoice data and monthly consumption analysis
- **Excel Export** - Export processed data to formatted Excel spreadsheets
- **Multi-Provider Support** - Supports Premier Energy, CEZ, E-Distribuție and more

## Tech Stack

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React 18** - Modern React with hooks
- **shadcn/ui** - Beautiful UI components built on Radix UI
- **Tailwind CSS** - Utility-first CSS framework
- **XLSX** - Excel file generation
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and state management

## Getting Started

### Prerequisites

- Node.js 18+ installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or bun package manager

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd InvoiceReport

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Project Structure

```
src/
├── components/       # React components
├── pages/           # Page components
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── data/            # Mock data
└── hooks/           # Custom React hooks
```

## Development

This project uses modern development tools and practices:

- **ESLint** for code linting
- **Vitest** for unit testing
- **TypeScript** for type safety
- **Tailwind CSS** for styling
