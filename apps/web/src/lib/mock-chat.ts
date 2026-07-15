import type { ChatMessage } from "@/components/chat/chat-interface";

export const MOCK_CONVERSATIONS = [
  {
    id: "c1",
    title: "Q3 ops automation plan",
    preview: "Draft a workflow with approval gates…",
    updatedAt: "12m ago",
  },
  {
    id: "c2",
    title: "Helix Labs renewal",
    preview: "Summarize negotiation risk…",
    updatedAt: "1h ago",
  },
  {
    id: "c3",
    title: "Knowledge gap review",
    preview: "Which docs should Support load first?",
    updatedAt: "Yesterday",
  },
  {
    id: "c4",
    title: "Device permissions",
    preview: "Approve ~/Projects/nexa for desktop companion",
    updatedAt: "Mon",
  },
] as const;

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content:
      "Draft a Q3 ops automation that chases unpaid invoices, but requires approval before sending email.",
  },
  {
    id: "m2",
    role: "assistant",
    content: `Here's a safe starter workflow:

1. **Trigger** — \`stripe.invoice.payment_failed\` or aging > 7 days  
2. **Enrich** — pull customer, ARR, owner from CRM  
3. **Draft** — generate a concise chase email  
4. **Approval gate** — require human approval (sensitive action: \`send_email\`)  
5. **Action** — send via Gmail OAuth on approve  
6. **Log** — write audit event \`automation.run\`

\`\`\`ts
{
  trigger: "invoice.aging",
  actions: ["enrich_customer", "draft_email"],
  approvalMode: "always",
  sensitive: ["send_email"]
}
\`\`\`

Want me to open this in Automations?`,
  },
  {
    id: "m3",
    role: "user",
    content: "Yes — also route high-value accounts to Sales Manager agent first.",
  },
  {
    id: "m4",
    role: "assistant",
    content:
      "Done conceptually. For accounts with ARR ≥ $25k, insert **Sales Manager (Chris Dalton)** review before the approval gate. Lower-value accounts go straight to Finance for draft + your approval.",
  },
];
