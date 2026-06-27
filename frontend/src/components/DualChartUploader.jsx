import { useEffect, useRef, useState } from "react";

function Slot({ label, badge, file, previewUrl, onFile, onClear, focused, onFocus }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  function handleFiles(files) {
    if (!files || !files[0]) return;
    const fileValue = files[0];
    if (!fileValue.type.startsWith("image/")) {
      alert("Please upload an image.");
      return;
    }
    onFile(fileValue, URL.createObjectURL(fileValue));
  }

  return (
    <div className={`slot ${focused ? "slot-focused" : ""}`} onClick={onFocus}>
      <div className="slot-header">
        <span className="slot-label">{badge}</span>
        <span>{label}</span>
      </div>
      <label
        className={`uploader compact ${drag ? "drag" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          handleFiles(event.dataTransfer.files);
        }}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
      >
        {previewUrl ? (
          <div className="preview-mini">
            <img src={previewUrl} alt={`${label} chart`} />
            <button
              className="remove-mini"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClear();
              }}
            >
              x
            </button>
          </div>
        ) : (
          <>
            <div className="upload-icon">Chart</div>
            <div className="title">Drop or click</div>
            <p>15-minute chart in PNG or JPG</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={(event) => handleFiles(event.target.files)} />
      </label>
    </div>
  );
}

export default function DualChartUploader({
  niftyFile,
  niftyPreview,
  bankFile,
  bankPreview,
  onNifty,
  onBank,
  onClearNifty,
  onClearBank,
}) {
  const [focused, setFocused] = useState("nifty");
  const [justPasted, setJustPasted] = useState(null);

  function handleClipboardItems(items) {
    if (!items) return false;

    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (!blob) continue;

        const extension = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
        const named = new File([blob], `clipboard-${Date.now()}.${extension}`, { type: blob.type });
        const url = URL.createObjectURL(named);

        if (focused === "bank") onBank(named, url);
        else onNifty(named, url);

        setJustPasted(focused);
        setTimeout(() => setJustPasted(null), 1400);
        return true;
      }
    }

    return false;
  }

  useEffect(() => {
    function onPaste(event) {
      if (handleClipboardItems(event.clipboardData?.items)) event.preventDefault();
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
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;

        const blob = await item.getType(imageType);
        const extension = (imageType.split("/")[1] || "png").replace("jpeg", "jpg");
        const named = new File([blob], `clipboard-${Date.now()}.${extension}`, { type: imageType });
        const url = URL.createObjectURL(named);

        if (focused === "bank") onBank(named, url);
        else onNifty(named, url);

        setJustPasted(focused);
        setTimeout(() => setJustPasted(null), 1400);
        return;
      }

      alert("No image found in the clipboard.");
    } catch {
      alert("Clipboard access denied. Use Ctrl+V.");
    }
  }

  return (
    <div className="dual-uploader">
      <div className="slot-grid">
        <Slot
          label="NIFTY 50"
          badge="N"
          file={niftyFile}
          previewUrl={niftyPreview}
          onFile={onNifty}
          onClear={onClearNifty}
          focused={focused === "nifty"}
          onFocus={() => setFocused("nifty")}
        />
        <Slot
          label="BANKNIFTY"
          badge="BN"
          file={bankFile}
          previewUrl={bankPreview}
          onFile={onBank}
          onClear={onClearBank}
          focused={focused === "bank"}
          onFocus={() => setFocused("bank")}
        />
      </div>

      <div className="paste-hint">
        <span>Paste target:</span>
        <button className={`mini-toggle ${focused === "nifty" ? "active" : ""}`} onClick={() => setFocused("nifty")}>
          NIFTY
        </button>
        <button className={`mini-toggle ${focused === "bank" ? "active" : ""}`} onClick={() => setFocused("bank")}>
          BANKNIFTY
        </button>
        <span className="paste-keys">
          <span className="kbd">Ctrl</span>
          <span className="kbd">V</span>
        </span>
        <button className="paste-btn" onClick={pasteFromButton}>Paste from clipboard</button>
      </div>

      {justPasted && (
        <div className="paste-toast">Pasted into {justPasted === "nifty" ? "NIFTY" : "BANKNIFTY"}.</div>
      )}
    </div>
  );
}
