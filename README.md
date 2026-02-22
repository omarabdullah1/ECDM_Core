# 🏢 ECDM Core — Enterprise CRM & ERP System

A full-stack Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) platform built with modern technologies.

---

## 📋 Overview

**ECDM Core** is a modular enterprise management system designed to streamline business operations across multiple domains:

| Module        | Description                                           |
|---------------|-------------------------------------------------------|
| **Auth**      | JWT-based authentication & role-based access control  |
| **CRM**       | Customer management, contacts, and relationship tracking |
| **ERP**       | Enterprise resource planning and business operations  |
| **Inventory** | Categories, products, and stock movement management   |

---

## 🛠️ Tech Stack

### Backend (`ecdm-core-backend`)
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Validation:** Zod
- **Security:** Helmet, CORS, Rate Limiting

### Frontend (`ecdm-core-frontend`)
- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind CSS 4
- **State:** Zustand
- **Forms:** React Hook Form + Zod validation
- **HTTP:** Axios
- **Icons:** Lucide React
- **Notifications:** React Hot Toast

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **MongoDB** (local or cloud instance)
- **npm** or **yarn**

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/ECDM_Core.git
cd ECDM_Core
```

### 2. Backend Setup
```bash
cd ecdm-core-backend
npm install

# Create .env from example
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start development server
npm run dev
```
The backend runs on **http://localhost:5001** by default.

### 3. Frontend Setup
```bash
cd ecdm-core-frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5001/api" > .env.local

# Start development server
npm run dev
```
The frontend runs on **http://localhost:3000** by default.

---

## 📁 Project Structure

```
ECDM_Core/
├── ecdm-core-backend/          # Express + TypeScript API
│   └── src/
│       ├── config/             # Database & app configuration
│       ├── features/
│       │   ├── auth/           # Authentication module
│       │   ├── crm/            # CRM module
│       │   ├── erp/            # ERP module
│       │   └── inventory/      # Inventory module
│       ├── middlewares/        # Auth, error handling, etc.
│       ├── utils/              # Shared utilities
│       ├── app.ts              # Express app setup
│       └── server.ts           # Server entry point
│
├── ecdm-core-frontend/         # Next.js 16 App
│   └── src/
│       ├── app/                # Next.js App Router pages
│       ├── components/         # Reusable UI components
│       ├── features/           # Feature-specific components
│       └── lib/                # Utilities, API client, stores
│
└── README.md
```

---

## 🔐 Environment Variables

### Backend (`.env`)
| Variable       | Description                    | Default                              |
|----------------|--------------------------------|--------------------------------------|
| `NODE_ENV`     | Environment mode               | `development`                        |
| `PORT`         | Server port                    | `5001`                               |
| `MONGODB_URI`  | MongoDB connection string      | `mongodb://localhost:27017/ecdm_core` |
| `JWT_SECRET`   | JWT signing secret             | —                                    |
| `JWT_EXPIRES_IN` | Token expiration             | `7d`                                 |
| `CORS_ORIGIN`  | Allowed CORS origin            | `http://localhost:3000`              |

### Frontend (`.env.local`)
| Variable               | Description       | Default                         |
|------------------------|--------------------|--------------------------------|
| `NEXT_PUBLIC_API_URL`  | Backend API URL    | `http://localhost:5001/api`     |

---

## 📜 Available Scripts

### Backend
| Command          | Description                     |
|------------------|---------------------------------|
| `npm run dev`    | Start dev server with hot-reload |
| `npm run build`  | Compile TypeScript to JavaScript |
| `npm start`      | Run production build             |
| `npm run lint`   | Run ESLint                       |

### Frontend
| Command          | Description                     |
|------------------|---------------------------------|
| `npm run dev`    | Start Next.js dev server         |
| `npm run build`  | Build for production             |
| `npm start`      | Start production server          |
| `npm run lint`   | Run ESLint                       |

---

## 📄 License

This project is proprietary and unlicensed for public distribution.

---

**Built with ❤️ by ECDM Solutions**
