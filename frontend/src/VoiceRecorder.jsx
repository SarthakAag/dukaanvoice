
import { useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function VoiceRecorder({
  language = "en-IN",
  onTranscript,
}) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  async function startRecording() {
    setError("");
    setTranscript("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone access is unavailable. Open the app on localhost using Chrome or Edge."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          if (!audioBlob.size) {
            throw new Error("No audio was recorded. Please try again.");
          }

          await sendAudio(audioBlob, recorder.mimeType);
        } catch (err) {
          setError(err.message || "Could not process the recording.");
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in your browser."
          : err.message || "Could not access the microphone."
      );
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      setRecording(false);
      recorder.stop();
    }
  }

  async function sendAudio(blob, mimeType) {
    setLoading(true);
    setError("");

    try {
      const extension = mimeType?.includes("ogg") ? "ogg" : "webm";
      const formData = new FormData();

      formData.append("audio_file", blob, `order.${extension}`);
      formData.append("language_code", language);
      formData.append("format", "transcribe");

      const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || `Transcription failed (${response.status}).`
        );
      }

      const text =
        data.transcript ??
        data.text ??
        data.result?.transcript ??
        data.result?.text ??
        data.data?.transcript ??
        data.data?.text ??
        "";

      if (typeof text !== "string" || !text.trim()) {
        console.error("Unexpected transcription response:", data);
        throw new Error(
          "Audio was sent, but no transcript was found in the response. Check the backend response."
        );
      }

      setTranscript(text);
      onTranscript?.(text, data);
    } catch (err) {
      setError(err.message || "Unable to transcribe audio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="voice-recorder">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={loading}
        className="record-button"
      >
        {recording
          ? "Stop recording"
          : loading
            ? "Transcribing..."
            : "Start voice order"}
      </button>

      {recording && <p>Listening… Speak your order, then stop recording.</p>}
      {loading && <p>Sending audio to DukaanVoice…</p>}

      {error && <p role="alert" className="voice-error">{error}</p>}

      {transcript && (
        <div className="transcript-result">
          <strong>Recognized order</strong>
          <p>{transcript}</p>
        </div>
      )}
    </section>
  );
}
