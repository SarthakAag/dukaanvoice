
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Mic,
  MicOff,
  ShoppingBasket,
  Package,
  Users,
  Plus,
  Minus,
  Trash2,
  Search,
  Languages,
  ClipboardList,
  IndianRupee,
  RotateCcw,
  Volume2,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import axios from "axios";
import "./App.css";
import SalesDashboard from "./components/dashboard/SalesDashboard";
import OrderHistory from "./components/history/OrderHistory";
import ProductManagement from "./components/products/ProductManagement";
import SupplierManagement from "./components/suppliers/SupplierManagement";

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------

const API = "http://127.0.0.1:8000/api";

const LANGUAGES = [
  { label: "English", code: "en-IN" },
  { label: "Tamil", code: "ta-IN" },
  { label: "Hindi", code: "hi-IN" },
  { label: "Telugu", code: "te-IN" },
  { label: "Kannada", code: "kn-IN" },
  { label: "Malayalam", code: "ml-IN" },
  { label: "Marathi", code: "mr-IN" },
  { label: "Bengali", code: "bn-IN" },
  { label: "Gujarati", code: "gu-IN" },
  { label: "Punjabi", code: "pa-IN" },
  { label: "Tamil-English", code: "ta-IN" },
  { label: "Hindi-English (Hindi recognition)", code: "hi-IN" },
];

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function extractTranscript(data, depth = 0) {
  if (depth > 6 || data == null) {
    return "";
  }

  if (typeof data === "string") {
    return data.trim();
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const text = extractTranscript(item, depth + 1);
      if (text) return text;
    }

    return "";
  }

  if (typeof data !== "object") {
    return "";
  }

  const keys = [
    "text",
    "transcript",
    "transcription",
    "recognized_text",
    "utterance",
  ];

  for (const key of keys) {
    if (typeof data[key] === "string" && data[key].trim()) {
      return data[key].trim();
    }
  }

  for (const key of ["data", "result", "results", "output"]) {
    if (data[key] !== undefined) {
      const text = extractTranscript(data[key], depth + 1);
      if (text) return text;
    }
  }

  return "";
}

const SUPPORTED_PRISMA_LANGUAGES = new Set([
  "as-IN",
  "bn-IN",
  "en-IN",
  "gu-IN",
  "hi-IN",
  "indic-auto",
  "kn-IN",
  "ml-IN",
  "mr-IN",
  "pa-IN",
  "ta-IN",
  "te-IN",
]);

function normalizePrismaLanguage(value) {
  const aliases = {
    "hi-en": "hi-IN",
    "ta-en": "ta-IN",
  };

  const normalized = aliases[value] || value;

  return SUPPORTED_PRISMA_LANGUAGES.has(normalized)
    ? normalized
    : "en-IN";
}

function getAudioExtension(mimeType) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

// ---------------------------------------------------------
// MAIN APPLICATION
// ---------------------------------------------------------

export default function App() {
  // Catalogue and cart
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  // Transcript and language
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [search, setSearch] = useState("");

  // Application status
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [clarifications, setClarifications] = useState([]);
  const [preview, setPreview] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Navigation
  const [showHistory, setShowHistory] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);

  // Recording references
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingCancelledRef = useRef(false);

  // -------------------------------------------------------
  // CLEAN UP MICROPHONE WHEN COMPONENT UNMOUNTS
  // -------------------------------------------------------

  const stopMicrophoneTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      recordingCancelledRef.current = true;

      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;

        try {
          recorder.stop();
        } catch {
          // The recorder may already have stopped.
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // -------------------------------------------------------
  // LOAD PRODUCT CATALOGUE
  // -------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await axios.get(`${API}/products`);

        if (!cancelled) {
          setProducts(response.data);
        }
      } catch {
        if (!cancelled) {
          setMessage(
            "Cannot connect to the backend. Make sure FastAPI is running."
          );
          setMessageType("error");
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------
  // DERIVED VALUES
  // -------------------------------------------------------

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return products;

    return products.filter((product) =>
      [product.name, ...(product.aliases || [])].some((name) =>
        name.toLowerCase().includes(query)
      )
    );
  }, [products, search]);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const cartItemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // -------------------------------------------------------
  // MESSAGE HELPER
  // -------------------------------------------------------

  function showMessage(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  // -------------------------------------------------------
  // CART MANAGEMENT
  // -------------------------------------------------------

  function addProduct(product) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.product_id === product.id
      );

      if (existing) {
        return current.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...current,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit: product.unit,
          unit_price: product.price,
        },
      ];
    });

    setPreview(null);
    setConfirmedOrder(null);
    setClarifications([]);
    showMessage(`${product.name} added to the cart.`, "success");
  }

  function changeQuantity(productId, amount) {
    setCart((current) =>
      current
        .map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: item.quantity + amount,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );

    setPreview(null);
    setConfirmedOrder(null);
    setClarifications([]);
  }

  function removeProduct(productId) {
    setCart((current) =>
      current.filter((item) => item.product_id !== productId)
    );

    setPreview(null);
    setConfirmedOrder(null);
    setClarifications([]);
    showMessage("Product removed from the cart.", "info");
  }

  // -------------------------------------------------------
  // ADD PARSED ITEMS TO CART
  // -------------------------------------------------------

  function addParsedItems(parsedItems) {
    setCart((current) => {
      const merged = current.map((item) => ({ ...item }));

      for (const parsed of parsedItems) {
        const existing = merged.find(
          (item) => item.product_id === parsed.product_id
        );

        if (existing) {
          existing.quantity += parsed.quantity;
        } else {
          merged.push({
            product_id: parsed.product_id,
            product_name: parsed.product_name,
            quantity: parsed.quantity,
            unit: parsed.unit,
            unit_price: parsed.unit_price,
          });
        }
      }

      return merged;
    });

    setPreview(null);
    setConfirmedOrder(null);
  }

  // -------------------------------------------------------
  // PARSE TRANSCRIPT USING FASTAPI
  // -------------------------------------------------------

  async function parseTranscript() {
    if (!transcript.trim()) {
      showMessage(
        "Please record or type an order first.",
        "warning"
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setClarifications([]);
    setPreview(null);
    setConfirmedOrder(null);

    try {
      const response = await axios.post(`${API}/orders/parse`, {
        transcript: transcript.trim(),
        language,
      });

      const result = response.data || {};

      const notes = Array.isArray(result.clarification_needed)
        ? result.clarification_needed
        : [];

      const messages = Array.isArray(result.messages)
        ? result.messages
        : [];

      // ---------------------------------------------------
      // PRICE ENQUIRY
      // Do not add price enquiries to the shopping cart.
      // ---------------------------------------------------

      if (result.intent === "ask_price") {
        const priceDetails = messages
          .filter(
            (item) =>
              item &&
              typeof item === "object" &&
              item.type === "price"
          )
          .map((item) => {
            const price = Number(item.price);

            if (!Number.isFinite(price)) {
              return `${item.product_name}: Price unavailable`;
            }

            return `${item.product_name}: ₹${price.toFixed(2)} per ${item.unit}`;
          });

        if (priceDetails.length > 0) {
          setClarifications([]);
          showMessage(priceDetails.join(" | "), "success");
        } else {
          setClarifications([]);
          showMessage(
            notes[0] || "Could not find the requested product price.",
            "warning"
          );
        }

        return;
      }

      // ---------------------------------------------------
      // STOCK ENQUIRY
      // Do not add stock enquiries to the shopping cart.
      // ---------------------------------------------------

      if (result.intent === "check_stock") {
        const stockDetails = messages
          .filter(
            (item) =>
              item &&
              typeof item === "object" &&
              item.type === "stock"
          )
          .map((item) => {
            const stock = Number(
              item.available_stock ?? item.stock
            );

            if (item.in_stock === false || stock === 0) {
              return `${item.product_name}: Currently out of stock`;
            }

            if (Number.isFinite(stock)) {
              return `${item.product_name}: ${stock} ${item.unit} available`;
            }

            return `${item.product_name}: Stock information unavailable`;
          });

        if (stockDetails.length > 0) {
          setClarifications([]);
          showMessage(stockDetails.join(" | "), "success");
        } else {
          setClarifications([]);
          showMessage(
            notes[0] || "Could not check product availability.",
            "warning"
          );
        }

        return;
      }

      // ---------------------------------------------------
      // CANCEL, REMOVE AND UPDATE REQUESTS
      // These require an existing-order workflow.
      // ---------------------------------------------------

      if (
        result.intent === "cancel_order" ||
        result.intent === "remove_item" ||
        result.intent === "update_item"
      ) {
        setClarifications(notes);

        showMessage(
          notes[0] ||
            "This request requires shopkeeper confirmation.",
          "warning"
        );

        return;
      }

      // ---------------------------------------------------
      // NORMAL ORDER PARSING
      // Only add items when the backend permits it.
      // ---------------------------------------------------

      if (result.can_add_to_cart !== true) {
        setClarifications(notes);

        showMessage(
          notes[0] ||
            "The order needs clarification. No products were added to the cart.",
          "warning"
        );

        return;
      }

      if (!Array.isArray(result.items) || result.items.length === 0) {
        setClarifications(notes);

        showMessage(
          notes[0] || "No valid products were recognized.",
          "warning"
        );

        return;
      }

      if (notes.length > 0) {
        setClarifications(notes);

        showMessage(
          "Resolve the clarification notes before adding this order.",
          "warning"
        );

        return;
      }

      addParsedItems(result.items);

      showMessage(
        "Order parsed successfully. Review the cart before validating.",
        "success"
      );
    } catch (error) {
      console.error("Order parsing error:", error);

      showMessage(
        error.response?.data?.detail ||
          "Could not parse the order. Check the backend.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------
  // MICROPHONE RECORDING
  // -------------------------------------------------------

  async function startRecording() {
    if (isRecording || isTranscribing || loading) {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      showMessage(
        "Recording is not supported in this browser. Try a recent version of Chrome or Edge.",
        "error"
      );
      return;
    }

    recordingCancelledRef.current = false;
    setMessage("");
    setPreview(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopMicrophoneTracks();
        setIsRecording(false);

        showMessage(
          "Recording failed. Please try again.",
          "error"
        );
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        audioChunksRef.current = [];
        stopMicrophoneTracks();
        setIsRecording(false);

        if (recordingCancelledRef.current) {
          return;
        }

        if (!audioBlob.size) {
          showMessage(
            "No audio was captured. Please record again.",
            "warning"
          );
          return;
        }

        if (audioBlob.size > 15 * 1024 * 1024) {
          showMessage(
            "This recording exceeds the 15 MB limit. Please make a shorter recording.",
            "error"
          );
          return;
        }

        await transcribeRecording(audioBlob);
      };

      recorder.start();

      setIsRecording(true);

      showMessage(
        "Listening... Speak clearly, then select Stop recording.",
        "info"
      );
    } catch (error) {
      stopMicrophoneTracks();

      if (error.name === "NotAllowedError") {
        showMessage(
          "Microphone permission was denied. Allow microphone access in your browser settings.",
          "error"
        );
      } else if (error.name === "NotFoundError") {
        showMessage(
          "No microphone was found. Connect a microphone and try again.",
          "error"
        );
      } else {
        showMessage(
          "Could not start recording. Check microphone permissions and try again.",
          "error"
        );
      }
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();

      showMessage(
        "Recording stopped. Preparing audio...",
        "info"
      );
    }
  }

  // -------------------------------------------------------
  // SEND AUDIO TO GNANI PRISMA
  // -------------------------------------------------------

  async function transcribeRecording(audioBlob) {
    setIsTranscribing(true);

    showMessage(
      "Sending audio to Gnani Prisma...",
      "info"
    );

    try {
      const extension = getAudioExtension(audioBlob.type);
      const formData = new FormData();

      formData.append(
        "audio_file",
        audioBlob,
        `order.${extension}`
      );

      formData.append(
        "language_code",
        normalizePrismaLanguage(language)
      );

      formData.append("format", "transcribe");

      const response = await axios.post(
        `${API}/transcribe`,
        formData,
        {
          timeout: 70000,
        }
      );

      const recognizedText = extractTranscript(response.data);

      if (!recognizedText) {
        console.error(
          "Unexpected Prisma response:",
          response.data
        );

        showMessage(
          "Prisma responded, but the transcript format was not recognized. Check the browser console and Prisma response.",
          "error"
        );

        return;
      }

      setTranscript(recognizedText);

      showMessage(
        "Transcription complete. Review the text and select Parse order.",
        "success"
      );
    } catch (error) {
      console.error("Prisma transcription error:", error);

      showMessage(
        error.response?.data?.detail ||
          "Transcription failed. Check your Prisma API key, supported audio format, and backend logs.",
        "error"
      );
    } finally {
      setIsTranscribing(false);
    }
  }

  // -------------------------------------------------------
  // VALIDATE ORDER ON BACKEND
  // -------------------------------------------------------

  async function previewOrder() {
    if (!cart.length) {
      showMessage(
        "Add at least one product before validating the order.",
        "warning"
      );
      return;
    }

    if (clarifications.length > 0) {
      showMessage(
        "Resolve the clarification notes before validating this order.",
        "warning"
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setPreview(null);
    setConfirmedOrder(null);

    try {
      const response = await axios.post(`${API}/orders/preview`, {
        language,
        items: cart.map((item) => ({
          ...item,
          line_total: Number(
            (item.quantity * item.unit_price).toFixed(2)
          ),
        })),
      });

      setPreview(response.data);

      // Replace local cart prices with server-verified prices.
      setCart(
        response.data.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
        }))
      );

      showMessage(
        "Order validated successfully. Review the server-calculated total.",
        "success"
      );
    } catch (error) {
      setPreview(null);

      showMessage(
        error.response?.data?.detail ||
          "Could not validate the order. Please check stock and quantities.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------
  // CONFIRM ORDER AND SAVE IT TO POSTGRESQL
  // -------------------------------------------------------

  async function confirmOrder() {
    if (!preview || cart.length === 0) {
      showMessage(
        "Validate the order before confirming it.",
        "warning"
      );
      return;
    }

    if (confirmedOrder || isConfirming) {
      return;
    }

    setIsConfirming(true);
    setMessage("");

    try {
      const response = await axios.post(`${API}/orders/confirm`, {
        language,
        items: cart.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
          line_total: Number(
            (
              Number(item.quantity) * Number(item.unit_price)
            ).toFixed(2)
          ),
        })),
      });

      setConfirmedOrder(response.data);

      showMessage(
        `Order ${response.data.order_number} confirmed successfully.`,
        "success"
      );

      // Refresh products separately after successful confirmation.
      try {
        const productsResponse = await axios.get(`${API}/products`);
        setProducts(productsResponse.data);
      } catch (refreshError) {
        console.error(
          "Product refresh failed after confirmation:",
          refreshError
        );
      }
    } catch (error) {
      showMessage(
        error.response?.data?.detail ||
          "Order confirmation failed. Check stock and try again.",
        "error"
      );
    } finally {
      setIsConfirming(false);
    }
  }

  // -------------------------------------------------------
  // NAVIGATION
  // -------------------------------------------------------

  async function toggleOrderHistory() {
    const next = !showHistory;

    setShowHistory(next);
    setShowDashboard(false);
    setShowProducts(false);
    setShowSuppliers(false);
  }

  function toggleDashboard() {
    const next = !showDashboard;

    setShowDashboard(next);
    setShowHistory(false);
    setShowProducts(false);
    setShowSuppliers(false);
  }

  function toggleProductManagement() {
    const next = !showProducts;

    setShowProducts(next);
    setShowHistory(false);
    setShowDashboard(false);
    setShowSuppliers(false);
  }

  function toggleSupplierManagement() {
    const next = !showSuppliers;

    setShowSuppliers(next);
    setShowHistory(false);
    setShowDashboard(false);
    setShowProducts(false);
  }

  // -------------------------------------------------------
  // TEXT-TO-SPEECH USING GNANI TIMBRE
  // -------------------------------------------------------

  async function speakConfirmation() {
    if (!preview?.confirmation_text) {
      showMessage(
        "Validate the order before requesting voice confirmation.",
        "warning"
      );
      return;
    }

    setIsSpeaking(true);

    try {
      const response = await axios.post(
        `${API}/speak`,
        {
          text: preview.confirmation_text,
          language,
          voice: "Kaveri",
          model: "timbre-v2.5",
        },
        {
          responseType: "blob",
          timeout: 95000,
        }
      );

      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);

        showMessage(
          "The audio could not be played. Check the Timbre response format.",
          "error"
        );
      };

      try {
        await audio.play();
      } catch {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);

        showMessage(
          "Your browser could not play the generated audio. Please try again.",
          "error"
        );
      }
    } catch (error) {
      console.error("Timbre speech error:", error);

      setIsSpeaking(false);

      showMessage(
        error.response?.data?.detail ||
          "Voice generation failed. Check your Timbre API key and backend logs.",
        "error"
      );
    }
  }

  // -------------------------------------------------------
  // RESET ORDER
  // -------------------------------------------------------

  function resetOrder() {
    if (isRecording) {
      recordingCancelledRef.current = true;

      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;

        try {
          recorder.stop();
        } catch {
          // Recorder may already have stopped.
        }
      }

      stopMicrophoneTracks();
      setIsRecording(false);
    }

    setCart([]);
    setTranscript("");
    setClarifications([]);
    setPreview(null);
    setConfirmedOrder(null);
    setSearch("");
    setMessage("");
    setMessageType("info");
  }

  // -------------------------------------------------------
  // RENDER UI
  // -------------------------------------------------------

  return (
    <main className="app-shell">
      {/* Navigation */}
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <ShoppingBasket size={23} />
          </span>

          <span>
            <strong>DukaanVoice</strong>
            <small>Voice-powered shop assistant</small>
          </span>
        </a>

        <div className="topbar-actions">
          <button
            type="button"
            className="secondary-button history-nav-button"
            onClick={toggleProductManagement}
            disabled={isConfirming}
          >
            <Package size={16} />
            {showProducts ? "Back to ordering" : "Products"}
          </button>

          <button
            type="button"
            className="secondary-button history-nav-button"
            onClick={toggleSupplierManagement}
            disabled={isConfirming}
          >
            <Users size={16} />
            {showSuppliers ? "Back to ordering" : "Suppliers"}
          </button>

          <button
            type="button"
            className="secondary-button history-nav-button"
            onClick={toggleDashboard}
            disabled={isConfirming}
          >
            <IndianRupee size={16} />
            {showDashboard ? "Back to ordering" : "Dashboard"}
          </button>

          <button
            type="button"
            className="secondary-button history-nav-button"
            onClick={toggleOrderHistory}
            disabled={isConfirming}
          >
            <ClipboardList size={16} />
            {showHistory ? "Back to ordering" : "Order History"}
          </button>
        </div>

        <div className="language-picker">
          <Languages size={18} />

          <select
            value={language}
            onChange={(event) => {
              setLanguage(event.target.value);
              setPreview(null);
              setConfirmedOrder(null);
            }}
            aria-label="Order language"
          >
            {LANGUAGES.map((item) => (
              <option
                key={`${item.label}-${item.code}`}
                value={item.code}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Hero */}
      <section className="welcome">
        <div>
          <span className="eyebrow">
            YOUR DIGITAL SHOP ASSISTANT
          </span>

          <h1>
            Take orders, <span>naturally.</span>
          </h1>

          <p>
            Speak or type a customer's order. Review the items,
            check the total, and validate everything before proceeding.
          </p>
        </div>

        <div className="welcome-icon">
          <ShoppingBasket size={44} />
        </div>
      </section>

      {/* Status message */}
      {message && (
        <div
          className="notice"
          role="status"
          style={
            messageType === "error"
              ? {
                  color: "#a53c35",
                  background: "#fff0ed",
                  borderColor: "#f2d3ce",
                }
              : messageType === "warning"
                ? {
                    color: "#79581e",
                    background: "#fff7e5",
                    borderColor: "#f0dfb6",
                  }
                : undefined
          }
        >
          {messageType === "error" ? (
            <AlertCircle
              size={17}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 8,
              }}
            />
          ) : messageType === "success" ? (
            <CheckCircle2
              size={17}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 8,
              }}
            />
          ) : null}

          {message}
        </div>
      )}

      {/* Clarification notes */}
      {clarifications.length > 0 && (
        <section className="clarification-panel">
          <strong>Please review these notes</strong>

          <ul>
            {clarifications.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ORDER HISTORY SCREEN */}
      {showHistory && (
        <OrderHistory onBack={() => setShowHistory(false)} />
      )}

      {/* SALES ANALYTICS DASHBOARD */}
      {showDashboard && (
        <SalesDashboard
          onMessage={showMessage}
          onProductsUpdated={async () => {
            try {
              const response = await axios.get(`${API}/products`);
              setProducts(response.data);
            } catch (error) {
              console.error(
                "Product catalogue refresh failed:",
                error
              );
            }
          }}
        />
      )}

      {/* SUPPLIER MANAGEMENT SCREEN */}
      {showSuppliers && (
        <SupplierManagement
          onBack={() => setShowSuppliers(false)}
        />
      )}

      {/* PRODUCT MANAGEMENT SCREEN */}
      {showProducts && (
        <ProductManagement
          onBack={() => setShowProducts(false)}
          onProductsUpdated={async () => {
            try {
              const response = await axios.get(`${API}/products`);
              setProducts(response.data);
            } catch (error) {
              console.error(
                "Product catalogue refresh failed:",
                error
              );
            }
          }}
        />
      )}

      {/* ORDERING SCREEN */}
      {!showHistory &&
        !showDashboard &&
        !showProducts &&
        !showSuppliers && (
          <>
            {/* Main workspace */}
            <section className="workspace">
              <div className="left-column">

                {/* Voice capture */}
                <section className="panel voice-panel">
                  <div className="section-heading">
                    <div className="heading-icon">
                      <Mic size={20} />
                    </div>

                    <div>
                      <h2>Capture an order</h2>
                      <p>
                        Record the customer or type their order below.
                      </p>
                    </div>
                  </div>

                  {/* Recording controls */}
                  <div className="voice-controls">
                    <button
                      type="button"
                      className={`record-button ${
                        isRecording ? "recording" : ""
                      }`}
                      onClick={
                        isRecording ? stopRecording : startRecording
                      }
                      disabled={
                        isTranscribing || loading || isSpeaking
                      }
                    >
                      {isRecording ? (
                        <MicOff size={19} />
                      ) : isTranscribing ? (
                        <LoaderCircle
                          size={19}
                          className="loading-spinner"
                        />
                      ) : (
                        <Mic size={19} />
                      )}

                      {isRecording
                        ? "Stop recording"
                        : isTranscribing
                          ? "Transcribing..."
                          : "Record order"}
                    </button>

                    <span className="record-hint">
                      {isRecording
                        ? "Listening to the customer..."
                        : isTranscribing
                          ? "Converting speech into text..."
                          : "Allow microphone access when prompted"}
                    </span>
                  </div>

                  <label
                    className="field-label"
                    htmlFor="transcript"
                  >
                    Recognized order / transcript
                  </label>

                  <textarea
                    id="transcript"
                    value={transcript}
                    onChange={(event) => {
                      setTranscript(event.target.value);
                      setPreview(null);
                      setConfirmedOrder(null);
                    }}
                    placeholder="Example: Two packets of rice, one litre oil, and three soaps"
                    rows={4}
                    disabled={isRecording || isTranscribing}
                  />

                  <button
                    type="button"
                    className="primary-button"
                    onClick={parseTranscript}
                    disabled={
                      loading ||
                      isRecording ||
                      isTranscribing ||
                      isSpeaking
                    }
                  >
                    {loading ? (
                      <LoaderCircle
                        size={18}
                        className="loading-spinner"
                      />
                    ) : (
                      <ClipboardList size={18} />
                    )}

                    {loading ? "Processing..." : "Parse order"}
                  </button>

                  <p className="helper-text">
                    Review the recognized text before adding products
                    to the cart. Always check the final quantities.
                  </p>
                </section>

                {/* Product catalogue */}
                <section className="panel catalogue-panel">
                  <div className="section-heading">
                    <div className="heading-icon">
                      <ShoppingBasket size={20} />
                    </div>

                    <div>
                      <h2>Product catalogue</h2>
                      <p>
                        {products.length} products available in this demo
                      </p>
                    </div>
                  </div>

                  <div className="search-box">
                    <Search size={18} />

                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search products..."
                      aria-label="Search products"
                    />
                  </div>

                  <div className="product-list">
                    {filteredProducts.map((product) => (
                      <article
                        className="product-row"
                        key={product.id}
                      >
                        <div className="product-avatar">
                          {product.name.charAt(0)}
                        </div>

                        <div className="product-info">
                          <strong>{product.name}</strong>

                          <span>
                            ₹{Number(product.price).toFixed(2)} /{" "}
                            {product.unit}
                          </span>

                          <small>
                            {product.stock} in stock
                          </small>
                        </div>

                        <button
                          type="button"
                          className="icon-button add-button"
                          onClick={() => addProduct(product)}
                          disabled={product.stock === 0}
                          aria-label={`Add ${product.name}`}
                          title={`Add ${product.name}`}
                        >
                          <Plus size={19} />
                        </button>
                      </article>
                    ))}

                    {filteredProducts.length === 0 && (
                      <p className="empty-state">
                        No matching products found.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {/* Cart */}
              <aside className="panel cart-panel">
                <div className="section-heading">
                  <div className="heading-icon">
                    <ClipboardList size={20} />
                  </div>

                  <div>
                    <h2>Current order</h2>

                    <p>
                      {cart.length}{" "}
                      {cart.length === 1 ? "product" : "products"} ·{" "}
                      {cartItemCount}{" "}
                      {cartItemCount === 1 ? "unit" : "units"}
                    </p>
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="empty-cart">
                    <ShoppingBasket size={42} />

                    <strong>Your cart is empty</strong>

                    <p>
                      Add products from the catalogue or parse an order
                      transcript to begin.
                    </p>
                  </div>
                ) : (
                  <div className="cart-items">
                    {cart.map((item) => (
                      <article
                        className="cart-item"
                        key={item.product_id}
                      >
                        <div className="cart-item-top">
                          <div>
                            <strong>{item.product_name}</strong>

                            <span>
                              ₹{Number(item.unit_price).toFixed(2)} /{" "}
                              {item.unit}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="icon-button delete-button"
                            onClick={() =>
                              removeProduct(item.product_id)
                            }
                            aria-label={`Remove ${item.product_name}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="cart-item-bottom">
                          <div className="quantity-control">
                            <button
                              type="button"
                              onClick={() =>
                                changeQuantity(item.product_id, -1)
                              }
                              aria-label={`Decrease ${item.product_name} quantity`}
                            >
                              <Minus size={14} />
                            </button>

                            <span>{item.quantity}</span>

                            <button
                              type="button"
                              onClick={() =>
                                changeQuantity(item.product_id, 1)
                              }
                              aria-label={`Increase ${item.product_name} quantity`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <strong>
                            ₹
                            {(
                              item.quantity * item.unit_price
                            ).toFixed(2)}
                          </strong>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div className="cart-summary">
                  <div>
                    <span>Estimated total</span>

                    <strong>
                      <IndianRupee size={19} />
                      {cartTotal.toFixed(2)}
                    </strong>
                  </div>

                  <p>
                    Final prices and stock are checked by the backend.
                  </p>

                  <button
                    type="button"
                    className="primary-button full-width"
                    onClick={previewOrder}
                    disabled={
                      loading ||
                      cart.length === 0 ||
                      isRecording ||
                      isTranscribing ||
                      isSpeaking
                    }
                  >
                    {loading ? (
                      <LoaderCircle
                        size={17}
                        className="loading-spinner"
                      />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}

                    {loading ? "Validating..." : "Validate order"}
                  </button>

                  <button
                    type="button"
                    className="secondary-button full-width"
                    onClick={resetOrder}
                    disabled={loading || isSpeaking}
                  >
                    <RotateCcw size={16} />
                    Clear order
                  </button>
                </div>

                {/* Server-validated preview */}
                {preview && (
                  <section className="preview-result">
                    <span className="success-label">
                      ORDER PREVIEW READY
                    </span>

                    <h3>Server-validated total</h3>

                    <strong className="preview-total">
                      ₹{Number(preview.total).toFixed(2)}
                    </strong>

                    <p>{preview.confirmation_text}</p>

                    <button
                      type="button"
                      className="primary-button full-width"
                      onClick={speakConfirmation}
                      disabled={isSpeaking || loading}
                    >
                      {isSpeaking ? (
                        <LoaderCircle
                          size={17}
                          className="loading-spinner"
                        />
                      ) : (
                        <Volume2 size={17} />
                      )}

                      {isSpeaking
                        ? "Generating voice..."
                        : "Speak order summary"}
                    </button>

                    {!confirmedOrder && (
                      <button
                        type="button"
                        className="primary-button full-width"
                        onClick={confirmOrder}
                        disabled={
                          isConfirming || loading || isSpeaking
                        }
                      >
                        {isConfirming ? (
                          <LoaderCircle
                            size={17}
                            className="loading-spinner"
                          />
                        ) : (
                          <CheckCircle2 size={17} />
                        )}

                        {isConfirming
                          ? "Confirming order..."
                          : "Confirm Order"}
                      </button>
                    )}

                    {confirmedOrder ? (
                      <div
                        className="confirmed-order"
                        role="status"
                      >
                        <span className="success-label">
                          ORDER CONFIRMED
                        </span>

                        <h3>Order saved successfully!</h3>

                        <p>
                          Order number:{" "}
                          <strong>
                            {confirmedOrder.order_number}
                          </strong>
                        </p>

                        <p>
                          Total amount:{" "}
                          <strong>
                            ₹{Number(confirmedOrder.total).toFixed(2)}
                          </strong>
                        </p>

                        <h4>Remaining stock</h4>

                        {confirmedOrder.items?.map((item) => (
                          <p key={item.product_id}>
                            {item.product_name}:{" "}
                            {item.remaining_stock} {item.unit} remaining
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="helper-text">
                        This is a preview only. No order has been finalized or saved.
                      </p>
                    )}
                  </section>
                )}
              </aside>
            </section>
          </>
        )}

      {/* Footer */}
      <footer className="footer">
        <span>DukaanVoice</span>

        <span>
          Built for local shops · Shopkeeper review required
        </span>
      </footer>
    </main>
  );
}
