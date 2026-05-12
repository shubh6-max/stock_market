import { useEffect, useRef, useState } from "react";

export default function ChartUploader({ file, previewUrl, onFile, onClear }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [justPasted, setJustPasted] = useState(false);

  function handleFiles(files) {
    if (!files || !files[0]) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) return alert("Please upload an image (PNG / JPG).");
    onFile(f, URL.createObjectURL(f));
  }

  function handleClipboardItems(items) {
    if (!items) return false;
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const blob = it.getAsFile();
        if (blob) {
          const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
          const named = new File([blob], `clipboard-${Date.now()}.${ext}`, { type: blob.type });
          onFile(named, URL.createObjectURL(named));
          setJustPasted(true);
          setTimeout(() => setJustPasted(false), 1400);
          return true;
        }
      }
    }
    return false;
  }

  // Global paste listener — works anywhere on the page
  useEffect(() => {
    function onPaste(e) {
      if (handleClipboardItems(e.clipboardData?.items)) e.preventDefault();
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function pasteFromButton(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator.clipboard?.read) {
      alert("Your browser doesn't expose clipboard reads via button. Use Ctrl+V instead.");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const imgType = it.types.find((t) => t.startsWith("image/"));
        if (imgType) {
          const blob = await it.getType(imgType);
          const ext = (imgType.split("/")[1] || "png").replace("jpeg", "jpg");
          const named = new File([blob], `clipboard-${Date.now()}.${ext}`, { type: imgType });
          onFile(named, URL.createObjectURL(named));
          setJustPasted(true);
          setTimeout(() => setJustPasted(false), 1400);
          return;
        }
      }
      alert("No image found in clipboard. Copy a screenshot first.");
    } catch (err) {
      alert("Clipboard access denied. Use Ctrl+V instead.\n\n" + err.message);
    }
  }

  return (
    <>
      <label
        className={`uploader ${drag ? "drag" : ""} ${justPasted ? "pasted" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="title">
          {justPasted ? "✓ Pasted from clipboard" : file ? "📷 " + file.name : "Drop chart, paste, or click to browse"}
        </div>
        <p>15-min candles · PNG / JPG · max 20MB</p>
        <div className="upload-hints">
          <span className="kbd">Ctrl</span><span className="kbd">V</span>
          <span className="hint-sep">to paste a screenshot anywhere on the page</span>
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={(e) => handleFiles(e.target.files)} />
      </label>

      <button className="btn-ghost" onClick={pasteFromButton} type="button" style={{ marginTop: 8 }}>
        📋 Paste from clipboard
      </button>

      {previewUrl && (
        <div className="preview">
          <img src={previewUrl} alt="chart preview" />
          <button className="remove" onClick={(e) => { e.stopPropagation(); onClear(); }}>✕ Remove</button>
        </div>
      )}
    </>
  );
}
