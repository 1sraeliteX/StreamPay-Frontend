"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { StreamRow, type StreamRowData } from "../components/StreamRow";
import { createRate, formatRate, type StreamInterval, type SupportedAsset } from "../lib/amount";
import { fetchWithIdempotency } from "../lib/apiClient";

export type StreamsViewState = "empty" | "loading" | "populated";

const streamListCopy = {
  description:
    "Track recipients, rates, statuses, and the next action from one scan-friendly streams list. Calendar-month streams prorate by UTC when starting or pausing mid-month.",
  empty: {
    actionLabel: "Create Your First Stream",
    description: "No streams yet. Create one to start paying collaborators and vendors on a steady schedule.",
    eyebrow: "Streams",
    title: "Your streams list is empty",
  },
  heading: "Streams",
  loadingLabel: "Loading streams",
  populatedCount: "3 active records",
  primaryCta: "Create Stream",
} as const;

type StreamSeed = Omit<StreamRowData, "rate"> & {
  asset: SupportedAsset;
  interval: StreamInterval;
  rateAmount: string;
};

const streamSeeds: StreamSeed[] = [
  {
    asset: "XLM",
    id: "stream-ada",
    interval: "month",
    nextAction: "Pause",
    rateAmount: "120",
    recipient: "Ada Creative Studio",
    schedule: adaMonthlySchedule.label,
    status: "active",
  },
  {
    asset: "XLM",
    id: "stream-kemi",
    interval: "week",
    nextAction: "Start",
    rateAmount: "32",
    recipient: "Kemi Onboarding Support",
    schedule: "Draft stream ready to launch",
    status: "draft",
  },
  {
    asset: "XLM",
    id: "stream-yusuf",
    interval: "day",
    nextAction: "Withdraw",
    rateAmount: "18",
    recipient: "Yusuf QA Partnership",
    schedule: "Ended yesterday with funds available",
    status: "ended",
  },
];

function renderRateOrFallback(rateAmount: string, asset: SupportedAsset, interval: StreamInterval): string {
  const rateResult = createRate(rateAmount, asset, interval);

  if (!rateResult.ok) {
    return "Invalid rate";
  }

  return formatRate(rateResult.value);
}

export const mockStreams: StreamRowData[] = streamSeeds.map(({ asset, interval, rateAmount, ...stream }) => ({
  ...stream,
  rate: renderRateOrFallback(rateAmount, asset, interval),
}));

type StreamsPageContentProps = {
  state?: StreamsViewState;
  streams?: StreamRowData[];
};

function StreamListSkeleton() {
  return (
    <section aria-label={streamListCopy.loadingLabel} className="stream-list">
      {Array.from({ length: 3 }).map((_, index) => (
        <article
          aria-hidden="true"
          className="stream-row stream-row--skeleton"
          data-testid="stream-row-skeleton"
          key={`stream-skeleton-${index + 1}`}
        >
          <div className="stream-row__primary">
            <div className="stream-row__skeleton-block">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--text" />
            </div>
            <div className="skeleton skeleton--badge" />
          </div>

          <div className="stream-row__meta stream-row__meta--skeleton">
            <div>
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--value" />
            </div>
            <div>
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--value" />
            </div>
          </div>

          <div className="skeleton skeleton--button" />
        </article>
      ))}
    </section>
  );
}

export function StreamsPageContent({
  state = "populated",
  streams = mockStreams,
}: StreamsPageContentProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportJob, setExportJob] = useState<{
    id: string;
    status: "pending" | "ready" | "failed" | "expired";
    signedUrl?: string;
    signedUrlExpiresAt?: string;
    expiresAt?: string;
    fileName?: string;
    rows?: number;
  } | null>(null);

  const isEmpty = state === "empty" || streams.length === 0;

  const fetchExportStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/exports/${id}`);
      if (!response.ok) {
        throw new Error(`Export status lookup failed: ${response.status}`);
      }
      const json = await response.json();
      setExportJob(json.data);
      if (json.data.status === "ready") {
        setExportMessage("Your export is ready. Download the file while this signed link is valid.");
      }
    } catch (error: any) {
      setExportMessage("Unable to fetch export status. Please try again later.");
    }
  };

  useEffect(() => {
    if (!exportJob || exportJob.status !== "pending") {
      return;
    }

    const timer = window.setTimeout(() => {
      fetchExportStatus(exportJob.id);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [exportJob]);

  const requestExport = async () => {
    setIsExporting(true);
    setExportMessage(null);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/exports", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Export request failed: ${response.status}`);
      }

      const json = await response.json();
      setExportJob(json.data);
      setExportMessage("Export requested. Preparing a short-lived download link...");
    } catch (error: any) {
      setExportMessage(null);
      setErrorMsg(error.message || "Unable to request export.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExport = async () => {
    if (!exportJob) {
      return;
    }

    try {
      const response = await fetch(`/api/exports/${exportJob.id}?download=true`);
      if (!response.ok) {
        throw new Error(`Export download failed: ${response.status}`);
      }

      const json = await response.json();
      if (json.data?.signedUrl) {
        window.location.assign(json.data.signedUrl);
      } else {
        throw new Error("Signed URL is unavailable.");
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Unable to download export.");
    }
  };

  const handleCreateStream = async () => {
    setIsCreating(true);
    setErrorMsg(null);
    
    try {
      await fetchWithIdempotency("/api/streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rate: "100 XLM / month",
          recipient: "New Collaborator",
        }),
      });
      
      alert("Stream created successfully!");
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">{streamListCopy.heading}</p>
          <h1 className="page-hero__title">Manage every stream from one list.</h1>
          <p className="page-hero__description">{streamListCopy.description}</p>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button 
            className="button button--primary" 
            type="button"
            onClick={handleCreateStream}
            disabled={isCreating}
          >
            {isCreating ? "Processing..." : streamListCopy.primaryCta}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={requestExport}
            disabled={isExporting}
          >
            {isExporting ? "Requesting export..." : "Export history"}
          </button>

          {exportJob && (
            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "1rem",
                padding: "1rem",
                maxWidth: "320px",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Export status</p>
              <p style={{ margin: "0.25rem 0 0", color: "var(--muted-light)" }}>
                {exportJob.status === "pending"
                  ? "Preparing your CSV export. This may take a few seconds."
                  : exportJob.status === "ready"
                  ? `Ready to download ${exportJob.fileName ?? "history.csv"}. Link expires ${new Date(
                      exportJob.signedUrlExpiresAt ?? ""
                    ).toLocaleString()}.`
                  : exportJob.status === "expired"
                  ? "This export has expired. Request a new download."
                  : "An error occurred while generating your export."}
              </p>

              {exportJob.status === "ready" && (
                <button
                  className="button button--primary"
                  type="button"
                  onClick={downloadExport}
                  style={{ marginTop: "0.75rem" }}
                >
                  Download export
                </button>
              )}
              {exportJob.status === "expired" && (
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={requestExport}
                  style={{ marginTop: "0.75rem" }}
                >
                  Request again
                </button>
              )}
            </div>
          )}

          {exportMessage && (
            <p style={{ color: "var(--muted-light)", fontSize: "0.875rem", maxWidth: "320px" }}>
              {exportMessage}
            </p>
          )}

          {errorMsg && (
            <p style={{ color: "red", fontSize: "0.875rem", maxWidth: "250px" }}>
              {errorMsg}
            </p>
          )}
        </div>
      </section>

      <section className="stream-layout" aria-labelledby="streams-overview-title">
        <div className="section-heading">
          <div>
            <h2 className="section-heading__title" id="streams-overview-title">
              Streams overview
            </h2>
            <p className="section-heading__description">
              Recipient, rate, status, and the primary next action stay visible at a glance.
            </p>
          </div>
          {state === "populated" && <p className="section-heading__meta">{streamListCopy.populatedCount}</p>}
        </div>

        {state === "loading" ? (
          <StreamListSkeleton />
        ) : isEmpty ? (
          <EmptyState
            actionLabel={streamListCopy.empty.actionLabel}
            description={streamListCopy.empty.description}
            eyebrow={streamListCopy.empty.eyebrow}
            title={streamListCopy.empty.title}
          />
        ) : (
          <section aria-label="Streams list" className="stream-list">
            {streams.map((stream) => (
              <StreamRow key={stream.id} stream={stream} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

export default function StreamsPage() {
  return <StreamsPageContent />;
}