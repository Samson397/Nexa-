"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Search,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const documents = [
  {
    name: "Q3_Ops_Playbook.pdf",
    type: "PDF",
    size: "2.4 MB",
    indexed: true,
    updated: "12m ago",
  },
  {
    name: "Helix_renewal_terms.docx",
    type: "DOCX",
    size: "480 KB",
    indexed: true,
    updated: "1h ago",
  },
  {
    name: "billing_export_june.xlsx",
    type: "XLSX",
    size: "1.1 MB",
    indexed: false,
    updated: "Yesterday",
  },
  {
    name: "brand-kit.zip",
    type: "ZIP",
    size: "18 MB",
    indexed: false,
    updated: "Mon",
  },
  {
    name: "automation-spec.md",
    type: "MD",
    size: "22 KB",
    indexed: true,
    updated: "Mon",
  },
  {
    name: "companion-bridge.ts",
    type: "CODE",
    size: "8 KB",
    indexed: true,
    updated: "Sun",
  },
  {
    name: "office-floorplan.png",
    type: "IMAGE",
    size: "3.2 MB",
    indexed: true,
    updated: "Last week",
  },
];

const typeIcon = {
  PDF: FileText,
  DOCX: FileText,
  XLSX: FileSpreadsheet,
  ZIP: FileArchive,
  MD: FileText,
  CODE: FileCode2,
  IMAGE: FileImage,
} as const;

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      documents.filter((doc) =>
        doc.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Knowledge
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Upload and index PDFs, Office docs, images, archives, markdown, and
          code for agent retrieval.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-dashed border-accent/40 bg-accent-soft/40 p-8 text-center"
      >
        <UploadCloud className="mx-auto h-10 w-10 text-accent" />
        <h2 className="mt-3 font-display text-lg font-semibold">
          Drop files to index
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          PDF, DOCX, XLSX, images, ZIP, MD, and source code. Sensitive docs stay
          in your tenant with audit trails.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button>Browse files</Button>
          <Button variant="outline">Import from Drive</Button>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Document library</CardTitle>
            <CardDescription>{filtered.length} items</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search knowledge…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((doc) => {
            const Icon = typeIcon[doc.type as keyof typeof typeIcon] ?? FileText;
            return (
              <div
                key={doc.name}
                className="flex flex-col gap-2 rounded-xl border border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} · {doc.size} · {doc.updated}
                    </p>
                  </div>
                </div>
                <Badge variant={doc.indexed ? "success" : "warning"}>
                  {doc.indexed ? "Indexed" : "Queued"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
