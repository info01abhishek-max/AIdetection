export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function getAssessmentColor(category: string): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'POSSIBLY_AI_ASSISTED':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'LIKELY_HUMAN_WRITTEN':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'MIXED_UNCERTAIN':
      return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    case 'INCONCLUSIVE':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export function getAssessmentLabel(category: string): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED':
      return 'Likely AI-Generated';
    case 'POSSIBLY_AI_ASSISTED':
      return 'Possibly AI-Assisted';
    case 'LIKELY_HUMAN_WRITTEN':
      return 'Likely Human-Written';
    case 'MIXED_UNCERTAIN':
      return 'Mixed / Uncertain';
    case 'INCONCLUSIVE':
      return 'Inconclusive';
    default:
      return 'Unknown';
  }
}

export function getAssessmentDescription(category: string): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED':
      return 'Multiple detectors and linguistic indicators strongly suggest AI authorship';
    case 'POSSIBLY_AI_ASSISTED':
      return 'Some indicators suggest AI involvement, but evidence is not conclusive';
    case 'LIKELY_HUMAN_WRITTEN':
      return 'Text characteristics align with human writing patterns';
    case 'MIXED_UNCERTAIN':
      return 'Conflicting signals prevent a confident determination';
    case 'INCONCLUSIVE':
      return 'Insufficient data or conflicting evidence for reliable classification';
    default:
      return 'Assessment unavailable';
  }
}

export function getAssessmentIcon(category: string): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED':
      return '⚠';
    case 'POSSIBLY_AI_ASSISTED':
      return '⚡';
    case 'LIKELY_HUMAN_WRITTEN':
      return '✓';
    case 'MIXED_UNCERTAIN':
      return '?';
    case 'INCONCLUSIVE':
      return '○';
    default:
      return '○';
  }
}

export function validateTextFile(file: File): { valid: boolean; error?: string } {
  const supportedTypes = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const supportedExtensions = ['.txt', '.pdf', '.docx'];
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();

  if (!supportedTypes.includes(file.type) && !supportedExtensions.includes(ext)) {
    return { valid: false, error: 'Unsupported file type. Please upload .txt, .pdf, or .docx files.' };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit.' };
  }

  return { valid: true };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countSentences(text: string): number {
  return text.trim().split(/[.!?]+/).filter(Boolean).length;
}

export function countParagraphs(text: string): number {
  return text.trim().split(/\n\s*\n/).filter(Boolean).length;
}

export function countCharacters(text: string): number {
  return text.length;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark class="bg-cyan-500/30 text-cyan-100 px-0.5 rounded">$1</mark>');
}