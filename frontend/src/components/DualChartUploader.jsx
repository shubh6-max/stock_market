import { useEffect, useRef, useState } from "react";

function Slot({ label, badge, file, previewUrl, onFile, onClear, focused, onFocus }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  function handleFiles(files) {
    if (!files || !files[0]) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) return alert("Please upload an image.");
    onFile(f, URL.createObjectURL(f));
  }

  return (
    <div className={`slot ${focused ? "slot-focused" : ""}`} onClick={onFocus}>
      <div className="slot-header">
        <span className="slot-label">{badge}</span>
        <span>{label}</span>
      </div>
      <label
        className={`uploader compact ${drag ? "drag" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        {previewUrl ? (
          <div className="preview-mini">
            <img src={previewUrl} alt={`${label} chart`} />
            <button className="remove-mini" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}>✕</button>
          </div>
        ) : (
          <>
            <div className="upload-icon">📷</div>
            <div className="title">Drop or click</div>
            <p>15-min chart · PNG/JPG</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={(e) => handleFiles(e.target.files)} />
      </label>
    </div>
  );
}

export default function DualChartUploader({
  niftyFile, niftyPreview, bankFile, bankPreview,
  onNifty, onBank, onClearNifty, onClearBank,
}) {
  const [focused, setFocused] = useState("nifty"); // which slot receives clipboard paste
  const [justPasted, setJustPasted] = useState(null);

  function handleClipboardItems(items) {
    if (!items) return false;
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const blob = it.getAsFile();
        if (blob) {
          const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
          const named = new File([blob], `clipboard-${Date.now()}.${ext}`, { type: blob.type });
          const url = URL.createObjectURL(named);
          if (focused === "bank") onBank(named, url);
          else onNifty(named, url);
          setJustPasted(focused);
          setTimeout(() => setJustPasted(null), 1400);
          return true;
        }
      }
    }
    return false;
  }

  useEffect(() => {
    function onPaste(e) {
      if (handleClipboardItems(e.clipboardData?.items)) e.preventDefault();
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [focused]);

  async function pasteFromButton() {
    if (!navigator.clipboard?.read) {
      alert("Use Ctrl+V on the page instead.");
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
          const url = URL.createObjectURL(named);
          if (focused === "bank") onBank(named, url);
          else onNifty(named, url);
          setJustPasted(focused);
          setTimeout(() => setJustPasted(null), 1400);
          return;
        }
      }
      alert("No image in clipboard.");
    } catch (e) {
      alert("Clipboard access denied. Use Ctrl+V.");
    }
  }

  return (
    <div className="dual-uploader">
      <div className="slot-grid">
        <Slot
          label="NIFTY 50" badge="N"
          file={niftyFile} previewUrl={niftyPreview}
          onFile={onNifty} onClear={onClearNifty}
          focused={focused === "nifty"} onFocus={() => setFocused("nifty")}
        />
        <Slot
          label="BANK NIFTY" badge="BN"
          file={bankFile} previewUrl={bankPreview}
          onFile={onBank} onClear={onClearBank}
          focused={focused === "bank"} onFocus={() => setFocused("bank")}
        />
      </div>

      <div className="paste-hint">
        <span>📋 Paste target:</span>
        <button
          className={`mini-toggle ${focused === "nifty" ? "active" : ""}`}
          onClick={() => setFocused("nifty")}
        >NIFTY</button>
        <button
          className={`mini-toggle ${focused === "bank" ? "active" : ""}`}
          onClick={() => setFocused("bank")}
        >BANKNIFTY</button>
        <span className="paste-keys">
          <span className="kbd">Ctrl</span><span className="kbd">V</span>
        </span>
        <button className="paste-btn" onClick={pasteFromButton}>Paste from clipboard</button>
      </div>

      {justPasted && (
        <div className="paste-toast">✓ Pasted into {justPasted === "nifty" ? "NIFTY" : "BANKNIFTY"} slot</div>
      )}
    </div>
  );
}
