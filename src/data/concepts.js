// concepts.js — 35 AI/FinOps Concepts for the DNA Tab
// WHY: These are the knowledge building blocks Nikhil needs to master.
// Categories control grouping in the DNA tab:
//   Core = foundational (learn first), Advanced = deeper topics,
//   Month2 = second month curriculum, Discuss = discussion-oriented.
// strength starts at 0, grows through quiz scores and manual review.
// lastReview and nextReview drive the spaced repetition engine.

const CONCEPTS = [
  // === Core (12) — Foundation concepts every AI PM needs ===
  { id: 1,  name: 'Prompt Engineering',          category: 'Core',     strength: 0 },
  { id: 2,  name: 'Token Economics',              category: 'Core',     strength: 0 },
  { id: 3,  name: 'LLM Architecture Basics',      category: 'Core',     strength: 0 },
  { id: 4,  name: 'RAG (Retrieval Augmented Gen)', category: 'Core',     strength: 0 },
  { id: 5,  name: 'Fine-Tuning vs Prompting',     category: 'Core',     strength: 0 },
  { id: 6,  name: 'API Design Patterns',          category: 'Core',     strength: 0 },
  { id: 7,  name: 'Cost Optimization',            category: 'Core',     strength: 0 },
  { id: 8,  name: 'Evaluation Metrics',           category: 'Core',     strength: 0 },
  { id: 9,  name: 'Context Windows',              category: 'Core',     strength: 0 },
  { id: 10, name: 'Streaming & SSE',              category: 'Core',     strength: 0 },
  { id: 11, name: 'Model Selection Strategy',     category: 'Core',     strength: 0 },
  { id: 12, name: 'Hallucination Mitigation',     category: 'Core',     strength: 0 },

  // === Advanced (10) — Deeper engineering topics ===
  { id: 13, name: 'Vector Databases',             category: 'Advanced', strength: 0 },
  { id: 14, name: 'Embedding Models',             category: 'Advanced', strength: 0 },
  { id: 15, name: 'Agent Architectures',          category: 'Advanced', strength: 0 },
  { id: 16, name: 'Tool Use & Function Calling',  category: 'Advanced', strength: 0 },
  { id: 17, name: 'Guardrails & Safety',          category: 'Advanced', strength: 0 },
  { id: 18, name: 'Multi-Modal AI',               category: 'Advanced', strength: 0 },
  { id: 19, name: 'Caching Strategies',           category: 'Advanced', strength: 0 },
  { id: 20, name: 'Rate Limiting & Throttling',   category: 'Advanced', strength: 0 },
  { id: 21, name: 'Batch Processing',             category: 'Advanced', strength: 0 },
  { id: 22, name: 'Error Handling in AI Systems',  category: 'Advanced', strength: 0 },

  // === Month2 (8) — Second month deep dives ===
  { id: 23, name: 'CI/CD for AI Products',        category: 'Month2',   strength: 0 },
  { id: 24, name: 'A/B Testing AI Features',      category: 'Month2',   strength: 0 },
  { id: 25, name: 'Observability & Logging',      category: 'Month2',   strength: 0 },
  { id: 26, name: 'AI Product Metrics',           category: 'Month2',   strength: 0 },
  { id: 27, name: 'User Feedback Loops',          category: 'Month2',   strength: 0 },
  { id: 28, name: 'Compliance & Data Privacy',    category: 'Month2',   strength: 0 },
  { id: 29, name: 'Latency Optimization',         category: 'Month2',   strength: 0 },
  { id: 30, name: 'Infrastructure Scaling',       category: 'Month2',   strength: 0 },

  // === Discuss (5) — Open-ended discussion topics ===
  { id: 31, name: 'AI Ethics & Bias',             category: 'Discuss',  strength: 0 },
  { id: 32, name: 'Build vs Buy Decisions',       category: 'Discuss',  strength: 0 },
  { id: 33, name: 'AI Product Roadmapping',       category: 'Discuss',  strength: 0 },
  { id: 34, name: 'Stakeholder Communication',    category: 'Discuss',  strength: 0 },
  { id: 35, name: 'Technical Debt in AI Systems',  category: 'Discuss',  strength: 0 },
]

export default CONCEPTS
