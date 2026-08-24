# Turbo-Tec

A modern React-based Enterprise Resource Planning (ERP) system built with Firebase, featuring comprehensive user management, company and dealer management, and role-based access control.

## 🚀 Features

- **Authentication & Authorization**
  - Firebase Authentication with email verification
  - Role-based access control (RBAC)
  - User status management (pending, approved, blocked)
  - Profile management with image upload

- **Company Management**
  - Company registration and editing
  - Company listing and management

- **Dealer Management**
  - Dealer registration with comprehensive forms
  - Dealer listing and editing
  - File upload capabilities
  - User assignment to dealers

- **User Management**
  - User registration and editing
  - User role management
  - Role hierarchy visualization
  - User page access control

- **Settings Management**
  - Brand management
  - Service management
  - User page configuration

- **Dashboard**
  - Analytics and overview
  - Data visualization with Recharts

## 🛠️ Tech Stack

- **Frontend Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 7.9.6
- **Styling**: Tailwind CSS 3.4.1
- **Backend**: Firebase
  - Authentication
  - Firestore Database
  - Cloud Storage
- **Charts**: Recharts 3.4.1
- **Testing**: React Testing Library

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project setup
- Firebase CLI (for deployment)

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd turbo-tec
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Copy your Firebase configuration
   - Update `src/firebase.jsx` with your Firebase config

4. Set up Firestore Rules:
   - The Firestore security rules are defined in `firestore.rules`
   - Deploy rules using: `firebase deploy --only firestore:rules`

5. Set up Storage Rules:
   - Storage rules are defined in `storage.rules`
   - Deploy rules using: `firebase deploy --only storage`

## 🚀 Available Scripts

### Development
```bash
npm run dev
# or
npm start
```
Runs the app in development mode at [http://localhost:3000](http://localhost:3000).
The page will reload automatically when you make changes.

### Build
```bash
npm run build
```
Builds the app for production to the `build` folder. The build is optimized and minified for best performance.

### Preview Production Build
```bash
npm run preview
```
Preview the production build locally before deploying.

### Testing
```bash
npm test
```
Launches the test runner in interactive watch mode.

### Deployment
```bash
npm run deploy
```
Builds the app and deploys to Firebase Hosting.

## 📁 Project Structure

```
turbo-tec/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── agent/         # Agent-related components
│   │   ├── common/        # Shared components (Dashboard, Login, Profile, etc.)
│   │   ├── company/       # Company management components
│   │   ├── dealer/        # Dealer management components
│   │   ├── settings/      # Settings components (Brands, Services, etc.)
│   │   ├── user/          # User management components
│   │   └── ui/            # Reusable UI components
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── constants/         # Application constants
│   ├── firebase.jsx       # Firebase configuration
│   ├── App.jsx            # Main application component
│   └── index.jsx          # Application entry point
├── firestore.rules        # Firestore security rules
├── storage.rules          # Firebase Storage security rules
├── firebase.json          # Firebase configuration
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Project dependencies
```

## 🔐 Security

The application implements comprehensive security measures:

- **Firestore Security Rules**: Role-based access control for database operations
- **Storage Rules**: Secure file upload and access control
- **Content Security Policy**: Configured in Firebase hosting headers
- **Authentication**: Email verification required for access
- **User Status Management**: Blocked and pending users are restricted

## 🌐 Routes

### Public Routes
- `/login` - User login page

### Protected Routes (Require Authentication & Email Verification)
- `/dashboard` - Main dashboard
- `/profile` - User profile management
- `/companies` - Company listing
- `/company-registration` - Register new company
- `/companies/edit/:id` - Edit company
- `/dealers` - Dealer listing
- `/dealers/add` - Register new dealer
- `/dealers/edit/:id` - Edit dealer
- `/agent-registration` - Register new agent
- `/users` - User listing
- `/users/add` - Register new user
- `/users/edit/:id` - Edit user
- `/user-roles` - User role management
- `/user-roles/add` - Create new role
- `/user-roles/edit/:id` - Edit role
- `/role-hierarchy` - Role hierarchy visualization
- `/user-pages` - User page access management
- `/services` - Service management
- `/brands` - Brand management

## 🎨 Styling

The project uses Tailwind CSS for styling with a modern, responsive design. Custom components are available in the `src/components/ui/` directory.

## 📝 Development Notes

- The application uses lazy loading for route components to optimize initial load time
- Error boundaries are implemented to handle module loading errors gracefully
- Custom hooks are used for common operations like form handling and data fetching
- The application supports code splitting for better performance

## 🔄 Deployment

The application is configured for Firebase Hosting. To deploy:

1. Build the application:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

Or use the combined command:
```bash
npm run deploy
```

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For contributions or questions, please contact the project maintainers.
