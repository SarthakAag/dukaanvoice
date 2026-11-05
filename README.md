# DukaanVoice – Multilingual Voice Assistant for Kirana Shops

**Making everyday retail operations simpler through natural voice interactions.**

DukaanVoice is a multilingual, voice-first AI assistant designed for local kirana shops and small retail businesses. It enables shopkeepers to interact with their shop management system using natural speech instead of relying entirely on manual data entry.

Using Gnani AI's speech technologies, DukaanVoice converts voice commands into actionable retail operations such as placing orders, checking product prices, checking stock availability and managing inventory.

---

## Overview

Small retail businesses frequently manage orders, product information and inventory manually. This can become time-consuming and may lead to errors, particularly when shopkeepers handle multiple customers.

DukaanVoice addresses this challenge through a simple voice-based interface.

A shopkeeper can speak naturally in a supported language, and the application processes the request, identifies the intent, extracts product information and performs the appropriate operation.

### Key Highlights

-  Voice-based interaction for retail operations.
-  Multilingual support for Indian languages.
-  Speech-to-text using Gnani AI Prisma.
-  Text-to-speech using Gnani AI Timbre.
-  Voice-based order processing.
-  Product price enquiries.
-  Real-time inventory and stock enquiries.
-  Intent recognition and product extraction.
-  Order preview and shopkeeper confirmation.
-  Order history and PDF invoice generation.
-  Sales and inventory dashboard.
-  Product and supplier management.

---

## Features

### 1. Multilingual Voice Recognition

DukaanVoice allows shopkeepers to interact using voice commands.

The application integrates **Gnani AI Prisma** to convert spoken input into text.

The recognized transcript is passed to the backend for further processing.

Supported language options in the application include:

- English
- Tamil
- Hindi
- Telugu
- Kannada
- Malayalam
- Marathi
- Bengali
- Gujarati
- Punjabi
- Tamil-English
- Hindi-English

Actual recognition accuracy depends on the language, pronunciation, audio quality and available product aliases.

### 2. Intelligent Intent Recognition

The backend identifies the purpose of a shopkeeper's request.

Supported intent categories include:

| Intent | Description |
|---|---|
| `place_order` | Identify products and quantities for an order |
| `ask_price` | Retrieve product pricing information |
| `check_stock` | Check product availability |
| `cancel_order` | Handle an existing-order cancellation request |
| `remove_item` | Handle a request to remove an item from an existing order |
| `update_item` | Handle a request to update an existing order item |

The system distinguishes between an enquiry and an actual order to prevent accidental cart additions.

### 3. Product and Quantity Extraction

The backend processes recognized text to identify:

- Product names.
- Product aliases.
- Requested quantities.
- Measurement units.
- Product availability.

The parsing logic uses multilingual aliases, number recognition and quantity extraction to convert natural-language requests into structured information.

### 4. Voice-Based Order Processing

Shopkeepers can place orders using natural voice commands.

Example:

> "I want two packets of rice."

The application:

1. Receives the voice input.
2. Converts speech into text using Prisma.
3. Identifies the requested product.
4. Extracts the quantity and unit.
5. Checks product availability.
6. Calculates the order total.
7. Displays an order preview.
8. Waits for shopkeeper confirmation.

### 5. Price Enquiry

Shopkeepers can ask for product prices without placing an order.

Example:

> "What is the price of rice?"

The system identifies the price enquiry, retrieves the product price and displays the response without adding the product to the cart.

### 6. Stock Enquiry

Shopkeepers can check product availability through voice commands.

Example:

> "Is rice available in stock?"

The backend retrieves the available inventory information and returns the relevant response.

### 7. Order Confirmation and Inventory Management

Before an order is saved, the application displays an order preview.

After confirmation:

- The backend validates the requested products.
- Product prices are retrieved from the database.
- Available inventory is checked.
- The order and order items are saved in PostgreSQL.
- Inventory quantities are updated transactionally.

This helps maintain consistency between orders and inventory.

### 8. Text-to-Speech Responses

DukaanVoice integrates **Gnani AI Timbre** to generate spoken responses.

This provides a more conversational experience and allows shopkeepers to hear confirmations instead of relying only on visual messages.

### 9. Dashboard and Order History

The application provides a dashboard for viewing retail-related information.

It also maintains order history so shopkeepers can access previously confirmed transactions.

### 10. PDF Invoice Generation

The application supports PDF invoice generation for confirmed orders.

This helps shopkeepers maintain transaction records.

### 11. Product and Supplier Management

The application includes dedicated sections for:

- Product catalogue management.
- Product information and pricing.
- Inventory information.
- Supplier records.
- Supplier contact information.

---

## System Architecture

DukaanVoice follows a frontend-backend architecture.

```text
                 SHOPKEEPER
                      |
                      |
               Voice Interaction
                      |
                      v
              REACT FRONTEND
                      |
                      |
                Audio Request
                      |
                      v
              FASTAPI BACKEND
                      |
            +---------+---------+
            |                   |
            v                   v
       GNANI PRISMA        AUDIO PROCESSING
       Speech-to-Text      FFmpeg Conversion
            |
            v
       RECOGNIZED TEXT
            |
            v
       INTENT RECOGNITION
            |
            v
       PRODUCT EXTRACTION
            |
            v
       ORDER VALIDATION
            |
            v
        POSTGRESQL
            |
            v
       ORDER CONFIRMATION
            |
            v
        GNANI TIMBRE
        Text-to-Speech
            |
            v
       SPOKEN RESPONSE
```

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| Backend | Python |
| Backend framework | FastAPI |
| Database | PostgreSQL |
| Database deployment | Docker |
| Speech-to-Text | Gnani AI Prisma |
| Text-to-Speech | Gnani AI Timbre |
| Audio conversion | FFmpeg |
| API communication | REST APIs |
| Data validation | Pydantic |

---

## Project Structure

```text
dukaanvoice/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   │
│   ├── routers/
│   │   ├── analytics.py
│   │   ├── inventory.py
│   │   ├── orders.py
│   │   ├── products.py
│   │   └── suppliers.py
│   │
│   ├── schemas/
│   │   ├── inventory.py
│   │   ├── order.py
│   │   ├── product.py
│   │   └── supplier.py
│   │
│   ├── services/
│   │   ├── analytics_service.py
│   │   ├── invoice_service.py
│   │   ├── order_parser.py
│   │   └── order_service.py
│   │
│   └── tests/
│       └── test_order_parser.py
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── services/
│   │   │   └── api.js
│   │   └── components/
│   │
│   ├── package.json
│   └── ...
│
├── .env
├── .gitignore
└── README.md
```

*Note: This is a representative structure of the main project modules. Additional files and components may exist in your local project.*

---

## Installation and Setup

### Prerequisites

Install the following tools:

- Python 3.10 or later.
- Node.js and npm.
- Docker Desktop.
- Git.
- FFmpeg.

Verify the installations:

```powershell
python --version
node --version
npm --version
docker --version
ffmpeg -version
```

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd dukaanvoice
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### 2. Start PostgreSQL

DukaanVoice uses PostgreSQL through Docker.

If the existing database container is already configured:

```powershell
docker start dukaanvoice-postgres
```

Verify the container:

```powershell
docker ps
```

If you are setting up the database for the first time, configure the PostgreSQL container and credentials according to your backend database configuration.

### 3. Configure Environment Variables

Create a `.env` file inside the backend directory.

Add your own credentials and database configuration:

```env
GNANI_PRISMA_API_KEY=your_prisma_api_key
GNANI_TTS_API_KEY=your_timbre_api_key

DATABASE_URL=your_postgresql_connection_string
```

Use the exact variable names and database URL format expected by your backend configuration.

**Important:** Never commit API keys, database passwords or other credentials to GitHub.

### 4. Set Up the Backend

Open a terminal:

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
pip install -r requirements.txt
```

If your project does not contain a `requirements.txt`, install the dependencies specified by your existing backend setup.

Start the FastAPI server:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend URL:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Set Up the Frontend

Open another terminal:

```powershell
cd frontend
```

Install the dependencies:

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### 6. Access the Application

Open the frontend URL in your browser:

```text
http://localhost:5173
```

Make sure PostgreSQL, the backend and the frontend are running.

---

## Application Workflow

The main DukaanVoice workflow is:

1. The shopkeeper selects a preferred language.
2. The shopkeeper speaks into the microphone.
3. Gnani Prisma converts the audio into text.
4. The backend receives the transcript.
5. The intent recognition system identifies the request.
6. Product names and quantities are extracted.
7. The backend validates the request against the product catalogue.
8. The application displays the appropriate result.
9. The shopkeeper reviews and confirms an order.
10. The backend saves the order and updates inventory.
11. Gnani Timbre generates a spoken response when requested.

---

## Testing

The backend includes automated tests for the order parsing functionality.

Run the parser tests from the project root:

```powershell
python -m py_compile backend\services\order_parser.py
```

Run the test suite:

```powershell
python -m pytest backend\tests\test_order_parser.py -v
```

### Important Test Scenarios

| Test Case | Expected Behaviour |
|---|---|
| Single product order | Recognizes product and quantity |
| Multiple product order | Extracts multiple products |
| Tamil product alias | Recognizes supported Tamil alias |
| Hindi product alias | Recognizes supported Hindi alias |
| Price enquiry | Returns price without creating an order |
| Stock enquiry | Returns stock information without creating an order |
| Cancellation request | Requires an existing order |
| Negated cancellation | Does not incorrectly classify as cancellation |
| Remove item request | Requires an existing order |
| Insufficient stock | Prevents invalid cart item creation |

Additional manual testing should cover voice recording, speech recognition, text-to-speech, order confirmation, inventory updates and invoice generation.

---

## Reliability and Validation

DukaanVoice includes validation mechanisms to reduce incorrect retail transactions.

- Product existence validation.
- Active product validation.
- Quantity extraction and unit handling.
- Inventory availability checks.
- Database-based price calculation.
- Shopkeeper confirmation before saving an order.
- Transactional order processing.
- Separate handling of price enquiries, stock enquiries and order requests.

These mechanisms help ensure that voice input is validated before it affects the shop's records.

---

## Project Objectives

The main objectives of DukaanVoice are:

1. Make digital retail management more accessible.
2. Reduce manual order entry.
3. Support natural multilingual interaction.
4. Simplify product and inventory enquiries.
5. Reduce errors in order processing.
6. Provide a simple voice-first experience for small businesses.

---

## Future Enhancements

Potential future improvements include:

- Improved multilingual intent recognition.
- Better handling of conversational follow-up commands.
- More robust product and quantity extraction.
- Improved handling of ambiguous voice requests.
- Additional language-specific testing.
- Improved speech recognition in noisy shop environments.
- Advanced AI-assisted language understanding.

---

## Gnani AI Integration

DukaanVoice uses Gnani AI technologies as a core part of its voice interaction workflow.

| Gnani Technology | Application |
|---|---|
| Prisma | Speech-to-text conversion |
| Timbre | Text-to-speech generation |

Prisma enables the application to understand spoken input, while Timbre enables spoken responses.

The recognized text is processed by the DukaanVoice backend to support retail-related operations.

---

## Why DukaanVoice?

Small businesses deserve simple and accessible technology.

DukaanVoice aims to bridge the gap between traditional retail workflows and modern AI-powered applications by making everyday shop operations possible through natural voice interactions.

**Our vision is simple: Let shopkeepers focus on their customers while technology handles the complexity behind the scenes.**

---

## Development

DukaanVoice is developed as a full-stack application using React, FastAPI and PostgreSQL, with Gnani AI speech technologies integrated into its voice interaction workflow.

---

## License

This project is currently developed as a hackathon project.

A formal open-source license can be added if the project is intended for public reuse and distribution.
