"use client";

import { useState } from "react";
import Dashboard from "@/components/Dashboard";
import Chat from "@/components/Chat";
import Resume from "@/components/Resume";
import KnowledgeManager from "@/components/KnowledgeManager";
import AgentPipeline from "@/components/AgentPipeline";
import type { AgentStep, Citation } from "@/lib/api";

type Tab = "chat" | "upload" | "resume" | "dashboard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const tabs: { id: Tab; label: string; desc: string }[] = [
    { id: "chat", label: "AI Chat", desc: "Multi-agent Q&A" },
    { id: "upload", label: "Upload", desc: "Add documents" },
    { id: "resume", label: "Knowledge Base", desc: "Stored documents" },
    { id: "dashboard", label: "System", desc: "Health & telemetry" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-dgip-border px-6 py-3 flex items-center justify-between bg-dgip-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-dgip-accent to-purple-600 flex items-center justify-center text-sm font-bold text-white">
              DG
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-dgip-success border-2 border-dgip-bg animate-pulse-dot" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight">
              Distributed Genetic Intelligence Platform
            </h1>
            <p className="text-[10px] text-dgip-muted tracking-wide uppercase">
              Multi-Agent RAG System &middot; Hybrid Retrieval &middot; MCP Protocol &middot; Google Search
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[10px] text-dgip-muted uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-dgip-success" />
            5 AI Agents
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-dgip-accent" />
            Vector DB
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-dgip-accent2" />
            4 MCP Tools
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <nav className="border-b border-dgip-border px-4 flex gap-1 bg-dgip-bg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs transition-all relative group ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-dgip-muted hover:text-dgip-text"
                }`}
              >
                <span className="font-medium">{tab.label}</span>
                <span className="hidden sm:inline text-dgip-muted/60 ml-1.5">
                  {tab.desc}
                </span>
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-dgip-accent to-purple-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Content */}
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {activeTab === "chat" && (
              <Chat
                onStepsUpdate={setSteps}
                onCitationsUpdate={setCitations}
                onProcessingChange={setIsProcessing}
              />
            )}
            {activeTab === "upload" && <KnowledgeManager />}
            {activeTab === "resume" && <Resume />}
            {activeTab === "dashboard" && <Dashboard />}
          </main>
        </div>

        {/* Right sidebar — Agent Pipeline Visualizer */}
        <aside className="hidden lg:flex w-80 border-l border-dgip-border flex-col bg-dgip-surface/30">
          <AgentPipeline
            steps={steps}
            citations={citations}
            isProcessing={isProcessing}
          />
        </aside>
      </div>
    </div>
  );
}
