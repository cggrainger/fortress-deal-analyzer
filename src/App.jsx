import { useState, useRef, useCallback, useEffect } from "react";

// ─── Currency & Percent Helpers ────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
const fmtPct = (v) => `${(v * 100).toFixed(1)}%`;

// ─── Calculation Engine (mirrors spreadsheet logic) ────────────────
function calculate(inputs) {
  const {
    fortressEstimate, supplementAdjPct, deductible,
    settledDealPrice, laborEstimate, materialEstimate,
    markupPct, measurementReport, inspectionCost,
    appointmentSetCost, insuranceEstCreationCost,
    proposalCreationCost, overheadAllocationCost,
    supplementCostRate, commissionRate, squares,
    clientName, projectAddress, repName, projectType, dateCreated
  } = inputs;

  const insuranceEstimate = fortressEstimate * (1 - supplementAdjPct);
  const cashToClient = insuranceEstimate - deductible;
  const totalMaterialAndLabor = laborEstimate + materialEstimate;
  const priceBasedOnMarkup = totalMaterialAndLabor * (1 + markupPct);
  const calculatedDealPrice = priceBasedOnMarkup;
  const settled = settledDealPrice || calculatedDealPrice;
  const grossRevenue = settled - totalMaterialAndLabor;
  const clientOutOfPocket = settled - cashToClient;
  const totalOverhead = measurementReport + inspectionCost + appointmentSetCost + insuranceEstCreationCost + proposalCreationCost + overheadAllocationCost;
  const supplementGain = fortressEstimate - insuranceEstimate;
  const supplementCost = supplementGain * supplementCostRate;
  const commissionCost = priceBasedOnMarkup * commissionRate;

  // No Supplement Results
  const noSupp = {
    settledDealPrice: settled,
    deductible,
    clientOutOfPocket,
    grossRevenue,
    overheadCosts: totalOverhead,
    commissionCost,
    netToFortress: grossRevenue - totalOverhead - commissionCost,
  };

  // With Supplement Results
  const withSupp = {
    settledDealPrice: settled,
    deductible,
    grossRevenue,
    supplementRevenue: supplementGain,
    totalRevenue: grossRevenue + supplementGain,
    overheadCosts: totalOverhead,
    commissionCost,
    supplementCost,
    totalCosts: totalOverhead + commissionCost + supplementCost,
    netToFortress: (grossRevenue + supplementGain) - (totalOverhead + commissionCost + supplementCost),
  };

  const effectiveLaborPerSq = squares > 0 ? laborEstimate / squares : 0;
  const effectiveMaterialPerSq = squares > 0 ? materialEstimate / squares : 0;

  return {
    insuranceEstimate, cashToClient, totalMaterialAndLabor, priceBasedOnMarkup,
    calculatedDealPrice, grossRevenue, clientOutOfPocket, totalOverhead,
    supplementGain, supplementCost, commissionCost,
    noSupp, withSupp, effectiveLaborPerSq, effectiveMaterialPerSq
  };
}

// ─── Animated Number Component ─────────────────────────────────────
function AnimNum({ value, prefix = "$", className = "" }) {
  return <span className={className}>{prefix === "$" ? fmt(value) : prefix === "%" ? fmtPct(value) : value.toFixed(2)}</span>;
}

// ─── Input Field Component ─────────────────────────────────────────
function Field({ label, value, onChange, type = "currency", hint, icon }) {
  const [rawText, setRawText] = useState(null);
  const isNumeric = type !== "text";

  const handleNumericChange = (e) => {
    const input = e.target.value;
    // Allow digits, one decimal point, and up to 2 decimal places
    const cleaned = input.replace(/[^0-9.]/g, "");
    // Prevent multiple decimal points
    const parts = cleaned.split(".");
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += "." + parts[1].slice(0, 2);
    }
    setRawText(formatted);
    onChange(formatted === "" || formatted === "." ? 0 : parseFloat(formatted));
  };

  const handleTextChange = (e) => onChange(e.target.value);

  const handleFocus = (e) => {
    e.target.style.borderColor = "#c4a262";
    e.target.style.boxShadow = "0 0 0 3px rgba(196,162,98,0.12)";
    if (isNumeric) {
      // Show raw number on focus for easy editing
      setRawText(value === 0 ? "" : String(value));
    }
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = "#ddd5c4";
    e.target.style.boxShadow = "none";
    setRawText(null); // Revert to formatted display
  };

  const displayValue = isNumeric
    ? (rawText !== null ? rawText : (value === 0 ? "" : String(value)))
    : value;

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "#8a7e6b", marginBottom: 6,
        fontFamily: "'DM Sans', sans-serif"
      }}>
        {icon && <span style={{ marginRight: 6, fontSize: 13 }}>{icon}</span>}
        {label}
        {hint && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 8, color: "#b5a98a", fontSize: 10 }}>{hint}</span>}
      </label>
      <input
        type="text"
        inputMode={isNumeric ? "decimal" : "text"}
        value={displayValue}
        onChange={isNumeric ? handleNumericChange : handleTextChange}
        placeholder={type === "currency" ? "$0.00" : type === "percent" ? "0.00" : type === "text" ? "—" : "0"}
        style={{
          width: "100%", padding: "12px 14px", fontSize: 16,
          border: "1.5px solid #ddd5c4", borderRadius: 10,
          background: "#fdfcf9", color: "#2d2a24",
          fontFamily: "'DM Mono', monospace", fontWeight: 500,
          transition: "border-color 0.2s, box-shadow 0.2s",
          outline: "none", boxSizing: "border-box",
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
}

// ─── Section Collapse Component ────────────────────────────────────
function Section({ title, icon, children, defaultOpen = true, accent = "#c4a262" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "#fff", borderRadius: 16, marginBottom: 16,
      border: "1px solid #e8e2d4", overflow: "hidden",
      boxShadow: open ? "0 4px 24px rgba(45,42,36,0.06)" : "none",
      transition: "box-shadow 0.3s"
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", background: "none", border: "none", cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "#2d2a24",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, background: accent + "18",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
          }}>{icon}</span>
          {title}
        </span>
        <span style={{
          transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s",
          fontSize: 18, color: "#b5a98a"
        }}>▾</span>
      </button>
      {open && <div style={{ padding: "0 20px 20px" }}>{children}</div>}
    </div>
  );
}

// ─── Result Line Component ─────────────────────────────────────────
function ResultLine({ label, value, bold, negative, highlight, sub }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: sub ? "6px 0 6px 16px" : "10px 0",
      borderBottom: "1px solid #f0ebe0",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{
        fontSize: sub ? 13 : 14, color: negative ? "#a65d57" : sub ? "#8a7e6b" : "#2d2a24",
        fontWeight: bold ? 700 : 400,
      }}>
        {negative && "– "}{label}
      </span>
      <span style={{
        fontSize: sub ? 13 : 15, fontFamily: "'DM Mono', monospace", fontWeight: bold ? 700 : 500,
        color: highlight ? (value >= 0 ? "#4a7c59" : "#a65d57") : negative ? "#a65d57" : "#2d2a24",
        background: highlight ? (value >= 0 ? "#e8f5ec" : "#fde8e7") : "none",
        padding: highlight ? "3px 10px" : 0, borderRadius: 6
      }}>
        {fmt(Math.abs(value))}
      </span>
    </div>
  );
}

// ─── Metric Card ───────────────────────────────────────────────────
function MetricCard({ label, value, color = "#c4a262", small }) {
  return (
    <div style={{
      flex: small ? "1 1 45%" : "1 1 100%", background: color + "0d",
      borderRadius: 14, padding: small ? "14px 16px" : "18px 20px",
      border: `1px solid ${color}22`, textAlign: "center",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
        color: "#8a7e6b", marginBottom: 6, fontFamily: "'DM Sans', sans-serif"
      }}>{label}</div>
      <div style={{
        fontSize: small ? 20 : 26, fontWeight: 700, color: color,
        fontFamily: "'DM Mono', monospace"
      }}>{typeof value === "string" ? value : fmt(value)}</div>
    </div>
  );
}

// ─── Bar Chart Component ───────────────────────────────────────────
function HBar({ label, value, max, color = "#c4a262" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#5a5347", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: "'DM Mono', monospace" }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "#f0ebe0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── Client Presentation View ──────────────────────────────────────
function ClientPresentation({ inputs, results, onBack, sharedMode, sharedData, onBuildShareUrl }) {
  const printRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // In shared mode, use the frozen data from the URL; otherwise use live calculations
  const isShared = sharedMode && sharedData;
  const display = isShared ? {
    clientName: sharedData.cn || "Client",
    projectAddress: sharedData.pa || "",
    repName: sharedData.rn || "",
    projectType: sharedData.pt || "",
    dateCreated: sharedData.dc || "",
    insuranceEstimate: sharedData.ie || 0,
    deductible: sharedData.ded || 0,
    cashToClient: sharedData.ctc || 0,
    clientOutOfPocket: sharedData.cop || 0,
    settledDealPrice: sharedData.sdp || 0,
    laborEstimate: sharedData.le || 0,
    materialEstimate: sharedData.me || 0,
    squares: sharedData.sq || 0,
  } : {
    clientName: inputs.clientName,
    projectAddress: inputs.projectAddress,
    repName: inputs.repName,
    projectType: inputs.projectType,
    dateCreated: inputs.dateCreated,
    insuranceEstimate: results.insuranceEstimate,
    deductible: inputs.deductible,
    cashToClient: results.cashToClient,
    clientOutOfPocket: results.clientOutOfPocket,
    settledDealPrice: inputs.settledDealPrice || results.calculatedDealPrice,
    laborEstimate: inputs.laborEstimate,
    materialEstimate: inputs.materialEstimate,
    squares: inputs.squares,
  };

  const handlePrint = () => {
    const content = printRef.current;
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Project Estimate - ${display.clientName || "Client"}</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'DM Sans', sans-serif; color: #2d2a24; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
      @media print { body { padding: 20px; } }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 600);
  };

  const handleShare = () => {
    const shareUrl = isShared ? window.location.href : onBuildShareUrl();
    if (navigator.share) {
      navigator.share({ title: `Estimate - ${display.clientName}`, text: `Project estimate for ${display.projectAddress}`, url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fdfcf9" }}>
      {/* Top Bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: "rgba(253,252,249,0.92)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid #e8e2d4",
        padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        {isShared ? (
          <div style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "#c4a262",
            letterSpacing: "0.04em"
          }}>FORTRESS</div>
        ) : (
          <button onClick={onBack} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#c4a262",
            display: "flex", alignItems: "center", gap: 6
          }}>← Back</button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleShare} style={{
            padding: "8px 16px", borderRadius: 8, border: "1.5px solid #c4a262",
            background: copied ? "#e8f5ec" : "none",
            color: copied ? "#4a7c59" : "#c4a262",
            fontWeight: 600, fontSize: 13,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.3s"
          }}>{copied ? "✓ Copied!" : "Share"}</button>
          <button onClick={handlePrint} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "#c4a262", color: "#fff", fontWeight: 600, fontSize: 13,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
          }}>Download PDF</button>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-block", padding: "6px 18px", borderRadius: 20,
            background: "#c4a262", color: "#fff", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16,
            fontFamily: "'DM Sans', sans-serif"
          }}>Project Estimate</div>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400,
            color: "#2d2a24", lineHeight: 1.2, marginBottom: 8
          }}>{display.clientName || "Client Name"}</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#8a7e6b" }}>
            {display.projectAddress || "Project Address"}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#b5a98a", marginTop: 6 }}>
            {display.projectType && `${display.projectType} • `}Prepared {display.dateCreated || new Date().toLocaleDateString()}
            {display.repName && ` • Rep: ${display.repName}`}
          </p>
        </div>

        {/* Key Figures */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e8e2d4",
          padding: 24, marginBottom: 24
        }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
            Project Summary
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <MetricCard label="Insurance Estimate" value={display.insuranceEstimate} color="#5a7c8a" small />
            <MetricCard label="Deductible" value={display.deductible} color="#a65d57" small />
            <MetricCard label="Cash to You" value={display.cashToClient} color="#4a7c59" small />
            <MetricCard label="Your Investment" value={display.clientOutOfPocket} color="#c4a262" small />
          </div>
        </div>

        {/* Breakdown */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e8e2d4",
          padding: 24, marginBottom: 24
        }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
            Cost Breakdown
          </h2>
          <ResultLine label="Project Price" value={display.settledDealPrice} bold />
          <ResultLine label="Insurance Pays" value={display.cashToClient} />
          <ResultLine label="Your Deductible" value={display.deductible} />
          <div style={{ height: 1, background: "#c4a26244", margin: "12px 0" }} />
          <ResultLine label="Your Out-of-Pocket" value={display.clientOutOfPocket} bold highlight />
        </div>

        {/* What's Included */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e8e2d4",
          padding: 24, marginBottom: 24
        }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
            What's Included
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: "1 1 45%", padding: "14px 16px", background: "#f8f6f0", borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Labor</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#2d2a24", fontFamily: "'DM Mono', monospace" }}>{fmt(display.laborEstimate)}</div>
            </div>
            <div style={{ flex: "1 1 45%", padding: "14px 16px", background: "#f8f6f0", borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Materials</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#2d2a24", fontFamily: "'DM Mono', monospace" }}>{fmt(display.materialEstimate)}</div>
            </div>
          </div>
          {display.squares > 0 && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0ebe0", borderRadius: 10, textAlign: "center" }}>
              <span style={{ fontSize: 13, color: "#5a5347", fontFamily: "'DM Sans', sans-serif" }}>
                <strong>{display.squares}</strong> squares total
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px 0", borderTop: "1px solid #e8e2d4" }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#c4a262", marginBottom: 4 }}>FORTRESS</div>
          <div style={{ fontSize: 12, color: "#b5a98a", fontFamily: "'DM Sans', sans-serif" }}>
            Professional Restoration Services
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── URL Data Encoding (client-safe fields only) ───────────────────
function encodeClientData(inputs, results) {
  const clientData = {
    cn: inputs.clientName, pa: inputs.projectAddress, rn: inputs.repName,
    pt: inputs.projectType, dc: inputs.dateCreated,
    ie: results.insuranceEstimate, ded: inputs.deductible,
    ctc: results.cashToClient, cop: results.clientOutOfPocket,
    sdp: inputs.settledDealPrice || results.calculatedDealPrice,
    le: inputs.laborEstimate, me: inputs.materialEstimate,
    sq: inputs.squares,
  };
  try {
    return btoa(encodeURIComponent(JSON.stringify(clientData)));
  } catch { return ""; }
}

function decodeClientData(encoded) {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch { return null; }
}

// ─── Main App ──────────────────────────────────────────────────────
export default function FortressDealAnalyzer() {
  const [view, setView] = useState("input");
  const [sharedMode, setSharedMode] = useState(false);
  const [sharedData, setSharedData] = useState(null);
  const [inputs, setInputs] = useState({
    clientName: "", projectAddress: "", repName: "", projectType: "Roof Replacement",
    dateCreated: new Date().toISOString().split("T")[0],
    fortressEstimate: 0, supplementAdjPct: 0.15, deductible: 0,
    settledDealPrice: 0, laborEstimate: 0, materialEstimate: 0,
    markupPct: 0.25, measurementReport: 0, inspectionCost: 0,
    appointmentSetCost: 0, insuranceEstCreationCost: 14.01,
    proposalCreationCost: 3.50, overheadAllocationCost: 130.00,
    supplementCostRate: 0.085, commissionRate: 0.10, squares: 0,
  });

  // On mount, check URL for shared client data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    if (d) {
      const decoded = decodeClientData(d);
      if (decoded) {
        setSharedData(decoded);
        setSharedMode(true);
        setView("client");
      }
    }
  }, []);

  const update = (key) => (val) => setInputs((p) => ({ ...p, [key]: val }));
  const results = calculate(inputs);

  // ─── SHARED MODE GUARD: lock to client view only ─────────────────
  if (sharedMode && view !== "client") {
    setView("client");
    return null;
  }

  // ─── INPUT VIEW ─────────────────────────────────────────────────
  if (view === "input") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, #f8f6f0 0%, #fdfcf9 40%, #f5f0e6 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "linear-gradient(180deg, rgba(45,42,36,0.97), rgba(45,42,36,0.92))",
          backdropFilter: "blur(12px)", padding: "16px 20px",
          borderBottom: "1px solid rgba(196,162,98,0.3)"
        }}>
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{
                fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#c4a262",
                letterSpacing: "0.04em"
              }}>FORTRESS</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Deal Analyzer</div>
            </div>
            <button onClick={() => setView("analysis")} style={{
              padding: "8px 20px", borderRadius: 8, border: "1.5px solid #c4a262",
              background: "rgba(196,162,98,0.12)", color: "#c4a262",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s"
            }}>
              View Analysis →
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 120px" }}>
          <Section title="Project Info" icon="📋" defaultOpen={true} accent="#5a7c8a">
            <Field label="Client Name" value={inputs.clientName} onChange={update("clientName")} type="text" icon="👤" />
            <Field label="Project Address" value={inputs.projectAddress} onChange={update("projectAddress")} type="text" icon="📍" />
            <Field label="Rep Name" value={inputs.repName} onChange={update("repName")} type="text" icon="🤝" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Project Type" value={inputs.projectType} onChange={update("projectType")} type="text" icon="🏠" />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Squares" value={inputs.squares} onChange={update("squares")} type="number" icon="📐" />
              </div>
            </div>
          </Section>

          <Section title="Insurance & Estimate" icon="🛡️" defaultOpen={true} accent="#c4a262">
            <Field label="Fortress Estimate" value={inputs.fortressEstimate} onChange={update("fortressEstimate")} hint="Total estimated project cost" icon="💰" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Supplement Adj %" value={inputs.supplementAdjPct} onChange={update("supplementAdjPct")} type="percent" hint="e.g. 0.15 = 15%" />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Deductible" value={inputs.deductible} onChange={update("deductible")} icon="🔒" />
              </div>
            </div>
            {/* Calculated preview */}
            <div style={{
              background: "#f8f6f0", borderRadius: 12, padding: 16, marginTop: 4,
              display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Insurance Estimate</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#5a7c8a", fontFamily: "'DM Mono', monospace" }}>{fmt(results.insuranceEstimate)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cash to Client</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4a7c59", fontFamily: "'DM Mono', monospace" }}>{fmt(results.cashToClient)}</div>
              </div>
            </div>
          </Section>

          <Section title="Labor & Materials" icon="🔨" defaultOpen={true} accent="#7c6a4a">
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Labor Estimate" value={inputs.laborEstimate} onChange={update("laborEstimate")} />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Material Estimate" value={inputs.materialEstimate} onChange={update("materialEstimate")} />
              </div>
            </div>
            <Field label="Markup on M&L" value={inputs.markupPct} onChange={update("markupPct")} type="percent" hint="e.g. 0.25 = 25%" />
            <div style={{
              background: "#f8f6f0", borderRadius: 12, padding: 16,
              display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total M&L</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#2d2a24", fontFamily: "'DM Mono', monospace" }}>{fmt(results.totalMaterialAndLabor)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Deal Price (Calc)</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#c4a262", fontFamily: "'DM Mono', monospace" }}>{fmt(results.calculatedDealPrice)}</div>
              </div>
            </div>
          </Section>

          <Section title="Deal Settlement" icon="✍️" defaultOpen={true} accent="#4a7c59">
            <Field label="Settled Deal Price" value={inputs.settledDealPrice} onChange={update("settledDealPrice")} hint="Override calc'd price (leave 0 to use calculated)" icon="📝" />
            <div style={{
              background: results.clientOutOfPocket > 0 ? "#fdf5e6" : "#e8f5ec",
              borderRadius: 12, padding: 16, textAlign: "center"
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Client Out of Pocket</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#c4a262", fontFamily: "'DM Mono', monospace" }}>{fmt(results.clientOutOfPocket)}</div>
            </div>
          </Section>

          <Section title="Overhead Costs" icon="📊" defaultOpen={false} accent="#8a7e6b">
            <Field label="Measurement Report" value={inputs.measurementReport} onChange={update("measurementReport")} />
            <Field label="Inspection Cost" value={inputs.inspectionCost} onChange={update("inspectionCost")} />
            <Field label="Appointment Set Cost" value={inputs.appointmentSetCost} onChange={update("appointmentSetCost")} />
            <Field label="Insurance Est. Creation" value={inputs.insuranceEstCreationCost} onChange={update("insuranceEstCreationCost")} />
            <Field label="Proposal Creation" value={inputs.proposalCreationCost} onChange={update("proposalCreationCost")} />
            <Field label="Overhead Allocation" value={inputs.overheadAllocationCost} onChange={update("overheadAllocationCost")} />
            <div style={{
              background: "#f8f6f0", borderRadius: 12, padding: 14, textAlign: "center"
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Overhead</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#a65d57", fontFamily: "'DM Mono', monospace" }}>{fmt(results.totalOverhead)}</div>
            </div>
          </Section>

          <Section title="Rates" icon="⚙️" defaultOpen={false} accent="#5a7c8a">
            <Field label="Supplement Cost Rate" value={inputs.supplementCostRate} onChange={update("supplementCostRate")} type="percent" hint="e.g. 0.085 = 8.5%" />
            <Field label="Commission Rate" value={inputs.commissionRate} onChange={update("commissionRate")} type="percent" hint="e.g. 0.10 = 10%" />
          </Section>
        </div>

        {/* Bottom Action Bar */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "rgba(45,42,36,0.97)", backdropFilter: "blur(12px)",
          padding: "14px 20px", borderTop: "1px solid rgba(196,162,98,0.3)"
        }}>
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", gap: 10 }}>
            <button onClick={() => setView("analysis")} style={{
              flex: 1, padding: "14px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #c4a262, #d4b87a)", color: "#2d2a24",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em"
            }}>
              View Internal Analysis
            </button>
            <button onClick={() => setView("client")} style={{
              flex: 1, padding: "14px", borderRadius: 10,
              border: "1.5px solid rgba(196,162,98,0.5)", background: "none",
              color: "#c4a262", fontWeight: 700, fontSize: 15, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em"
            }}>
              Client View
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ANALYSIS VIEW ──────────────────────────────────────────────
  if (view === "analysis") {
    const settled = inputs.settledDealPrice || results.calculatedDealPrice;
    const maxBar = Math.max(settled, results.withSupp.totalRevenue, results.totalMaterialAndLabor);

    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, #f8f6f0 0%, #fdfcf9 40%, #f5f0e6 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "linear-gradient(180deg, rgba(45,42,36,0.97), rgba(45,42,36,0.92))",
          backdropFilter: "blur(12px)", padding: "16px 20px",
          borderBottom: "1px solid rgba(196,162,98,0.3)"
        }}>
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setView("input")} style={{
              background: "none", border: "none", cursor: "pointer", color: "#c4a262",
              fontWeight: 600, fontSize: 14, fontFamily: "'DM Sans', sans-serif"
            }}>← Edit</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "#c4a262" }}>INTERNAL ANALYSIS</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{inputs.clientName || "Project"} • {inputs.projectAddress || "Address"}</div>
            </div>
            <button onClick={() => setView("client")} style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid #c4a262",
              background: "none", color: "#c4a262", fontWeight: 600, fontSize: 12,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
            }}>Client →</button>
          </div>
        </div>

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 40px" }}>
          {/* Key Metrics */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <MetricCard label="Net (No Supp)" value={results.noSupp.netToFortress} color={results.noSupp.netToFortress >= 0 ? "#4a7c59" : "#a65d57"} small />
            <MetricCard label="Net (With Supp)" value={results.withSupp.netToFortress} color={results.withSupp.netToFortress >= 0 ? "#4a7c59" : "#a65d57"} small />
            <MetricCard label="Gross Revenue" value={results.grossRevenue} color="#c4a262" small />
            <MetricCard label="Client OOP" value={results.clientOutOfPocket} color="#5a7c8a" small />
          </div>

          {/* Revenue Waterfall */}
          <Section title="Revenue Waterfall" icon="📈" accent="#4a7c59">
            <HBar label="Settled Deal Price" value={settled} max={maxBar} color="#5a7c8a" />
            <HBar label="Material & Labor" value={results.totalMaterialAndLabor} max={maxBar} color="#8a7e6b" />
            <HBar label="Gross Revenue" value={results.grossRevenue} max={maxBar} color="#c4a262" />
            <HBar label="Supplement Gain" value={results.supplementGain} max={maxBar} color="#4a7c59" />
            <HBar label="Total Revenue (w/ Supp)" value={results.withSupp.totalRevenue} max={maxBar} color="#2d8a5e" />
          </Section>

          {/* Results Without Supplement */}
          <Section title="Results — No Supplement" icon="📋" accent="#5a7c8a">
            <ResultLine label="Settled Deal Price" value={results.noSupp.settledDealPrice} bold />
            <ResultLine label="Deductible" value={results.noSupp.deductible} />
            <ResultLine label="Client Out of Pocket" value={results.noSupp.clientOutOfPocket} />
            <div style={{ height: 1, background: "#e8e2d4", margin: "8px 0" }} />
            <ResultLine label="Gross Revenue" value={results.noSupp.grossRevenue} bold />
            <ResultLine label="Overhead Costs" value={results.noSupp.overheadCosts} negative sub />
            <ResultLine label="Commission Cost" value={results.noSupp.commissionCost} negative sub />
            <div style={{ height: 2, background: "#c4a26244", margin: "8px 0" }} />
            <ResultLine label="Net to Fortress" value={results.noSupp.netToFortress} bold highlight />
          </Section>

          {/* Results With Supplement */}
          <Section title="Results — With Supplement" icon="🚀" accent="#4a7c59">
            <ResultLine label="Settled Deal Price" value={results.withSupp.settledDealPrice} bold />
            <ResultLine label="Deductible" value={results.withSupp.deductible} />
            <div style={{ height: 1, background: "#e8e2d4", margin: "8px 0" }} />
            <ResultLine label="Gross Revenue" value={results.withSupp.grossRevenue} />
            <ResultLine label="Supplement Revenue" value={results.withSupp.supplementRevenue} />
            <ResultLine label="Total Revenue" value={results.withSupp.totalRevenue} bold />
            <div style={{ height: 1, background: "#e8e2d4", margin: "8px 0" }} />
            <ResultLine label="Overhead Costs" value={results.withSupp.overheadCosts} negative sub />
            <ResultLine label="Commission Cost" value={results.withSupp.commissionCost} negative sub />
            <ResultLine label="Supplement Cost" value={results.withSupp.supplementCost} negative sub />
            <ResultLine label="Total Costs" value={results.withSupp.totalCosts} negative bold />
            <div style={{ height: 2, background: "#4a7c5944", margin: "8px 0" }} />
            <ResultLine label="Net to Fortress" value={results.withSupp.netToFortress} bold highlight />
          </Section>

          {/* Cost Breakdown */}
          <Section title="Cost Breakdown" icon="💸" accent="#a65d57" defaultOpen={false}>
            <ResultLine label="Overhead Costs" value={results.totalOverhead} />
            <ResultLine label="Commission" value={results.commissionCost} />
            <ResultLine label="Supplement Processing" value={results.supplementCost} />
            <div style={{ height: 1, background: "#e8e2d4", margin: "8px 0" }} />
            <ResultLine label="Total Costs" value={results.withSupp.totalCosts} bold />
          </Section>

          {/* Per Square Analysis */}
          {inputs.squares > 0 && (
            <Section title="Per Square Analysis" icon="📐" accent="#7c6a4a" defaultOpen={false}>
              <div style={{ display: "flex", gap: 12 }}>
                <MetricCard label={`Labor / Sq (${inputs.squares} sq)`} value={results.effectiveLaborPerSq} color="#5a7c8a" small />
                <MetricCard label={`Material / Sq (${inputs.squares} sq)`} value={results.effectiveMaterialPerSq} color="#7c6a4a" small />
              </div>
            </Section>
          )}

          {/* Supplement Comparison */}
          <Section title="Supplement Impact" icon="⚡" accent="#c4a262" defaultOpen={true}>
            <div style={{
              display: "flex", gap: 12, flexWrap: "wrap"
            }}>
              <div style={{
                flex: "1 1 45%", background: "#f8f6f0", borderRadius: 14, padding: 18,
                textAlign: "center", border: "1px solid #e8e2d4"
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#8a7e6b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Without Supplement</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: results.noSupp.netToFortress >= 0 ? "#4a7c59" : "#a65d57" }}>
                  {fmt(results.noSupp.netToFortress)}
                </div>
                <div style={{ fontSize: 11, color: "#8a7e6b", marginTop: 4 }}>net profit</div>
              </div>
              <div style={{
                flex: "1 1 45%", background: "linear-gradient(135deg, #4a7c5910, #4a7c5918)", borderRadius: 14, padding: 18,
                textAlign: "center", border: "1px solid #4a7c5933"
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#4a7c59", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>With Supplement</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: results.withSupp.netToFortress >= 0 ? "#4a7c59" : "#a65d57" }}>
                  {fmt(results.withSupp.netToFortress)}
                </div>
                <div style={{ fontSize: 11, color: "#4a7c59", marginTop: 4 }}>net profit</div>
              </div>
            </div>
            {results.withSupp.netToFortress > results.noSupp.netToFortress && (
              <div style={{
                marginTop: 16, textAlign: "center", padding: "12px 16px",
                background: "#e8f5ec", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2d8a5e"
              }}>
                Supplement adds {fmt(results.withSupp.netToFortress - results.noSupp.netToFortress)} in net profit
                ({((results.withSupp.netToFortress / Math.max(results.noSupp.netToFortress, 0.01) - 1) * 100).toFixed(0)}% increase)
              </div>
            )}
          </Section>
        </div>
      </div>
    );
  }

  // ─── CLIENT VIEW ────────────────────────────────────────────────
  if (view === "client") {
    const buildShareUrl = () => {
      const encoded = encodeClientData(inputs, results);
      const base = window.location.origin + window.location.pathname;
      return `${base}?d=${encoded}`;
    };

    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <ClientPresentation
          inputs={inputs}
          results={results}
          onBack={() => setView("analysis")}
          sharedMode={sharedMode}
          sharedData={sharedData}
          onBuildShareUrl={buildShareUrl}
        />
      </>
    );
  }

  return null;
}
