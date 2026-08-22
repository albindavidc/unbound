# Unbound - E-Commerce Platform

## 📖 Project Overview
Unbound is a comprehensive, full-stack e-commerce web application built with a robust Node.js and Express.js backend and a dynamic, server-rendered EJS frontend. It provides a seamless shopping experience for customers and a powerful management dashboard for administrators. The platform supports advanced features like custom product designs, wallet systems, referral programs, secure Razorpay payments, and automated invoice/report generation.

## ✨ Features
### User Features (Frontend)
- **Authentication & Security:** Local login, Google OAuth, password hashing (Bcrypt), and secure session management.
- **Product Discovery:** Browse products by categories, search, and filter. Includes image zooming (JS-Image-Zoom) for detailed viewing.
- **Customized Products:** Interactive canvas (Fabric.js) allowing users to design or customize their products.
- **Shopping Experience:** Add to Cart, Wishlist management, and seamless checkout process.
- **Payments & Wallets:** Integrated Razorpay for secure payments and a built-in virtual Wallet system for refunds and purchases.
- **Promotions:** Apply Coupons and earn through a Referral program.
- **User Dashboard:** Manage addresses, track orders, view wallet history, and edit profile details with image cropping (Cropper.js).

### Admin Features (Backend Dashboard)
- **Product & Category Management:** Add, edit, or remove products and categories with image processing (Sharp/Jimp).
- **Order & Payment Tracking:** Monitor all orders, update statuses, and view payment details.
- **Marketing Tools:** Manage Banners, generate Coupons, and monitor the Referral system.
- **Analytics & Reporting:** Generate and download comprehensive sales reports in Excel (ExcelJS) and PDF (PDFKit/Puppeteer) formats.

## 🛠️ Technology Stack
**Frontend:**
- **Templating:** EJS
- **Styling:** Tailwind CSS, PostCSS, Autoprefixer
- **UI Components & Icons:** SweetAlert2, Iconify
- **Utilities & Libraries:** Cropper.js, JS-Image-Zoom, Fabric.js, jsPDF, jbValidator

**Backend:**
- **Core:** Node.js, Express.js
- **Architecture:** MVC (Model-View-Controller)
- **Database & ODM:** MongoDB, Mongoose
- **Authentication:** Passport.js, OAuth (Google), Bcrypt.js, Express-Session, Connect-Mongo
- **File & Image Processing:** Multer, Sharp, Jimp
- **Document Generation:** ExcelJS, PDFKit, Puppeteer
- **Utilities:** Razorpay (Payments), Nodemailer (Emails), Dotenv, Morgan (Logging), Compression, UUID, Base62

**Deployment & Infrastructure:**
- **Cloud Hosting:** Google Cloud Platform (GCP)
- **Server Management:** Nginx (Reverse Proxy), PM2 (Process Manager)
- **Security & DNS:** SSL/TLS, Custom DNS Configuration
- **Version Control:** Git

## 📂 Project Structure
```text
unbound/
├── config/           # Database, Passport, and other configuration files
├── controllers/      # Route controllers (Admin and User logic separated)
│   ├── admin/
│   └── user/
├── middlewares/      # Authentication guards, error handlers, upload interceptors
├── models/           # Mongoose schemas (User, Product, Order, Cart, Wallet, etc.)
├── public/           # Static assets (CSS, JS, Images, compiled Tailwind)
├── routes/           # Express route definitions
├── views/            # EJS templates (Pages and Partials)
├── .env              # Environment variables (Ignored in Git)
├── app.js            # Main application entry point
├── package.json      # Project metadata and dependencies
└── tailwind.config.js# Tailwind CSS configuration
```

## ⚙️ Setup and Installation

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (Local or Atlas URI)
- Git

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd unbound
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and configure the following variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_secret_key

# OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://localhost:3000/auth/google/callback

# Razorpay Credentials
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

### 4. Build Tailwind CSS
To compile the Tailwind CSS file, run:
```bash
npm run build
```
*Note: For development, you can use `npm run dev` to watch for CSS changes.*

### 5. Start the Application
To start the server in development mode (using Nodemon):
```bash
npm start
```
The application will be running at `http://localhost:3000`.

## 📖 Usage Guidelines
- **Development:** Ensure you run `npm run dev` in a separate terminal if you are actively modifying EJS files using Tailwind utility classes so the CSS rebuilds automatically.
- **Admin Access:** You may need to manually change a user's `role` to `admin` directly in the MongoDB database to access the `/admin` dashboard routes for the first time.
- **Image Uploads:** Ensure the `public/uploads` directory has appropriate write permissions so Multer can save product and profile pictures.

---
*Developed by Albin David*
