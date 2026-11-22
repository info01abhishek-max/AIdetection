export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  size: number;
  name: string;
  type: string;
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 500 * 1024 * 1024; // 500MB
  const supportedTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];
  const supportedExtensions = ['.mp4', '.mov', '.mkv', '.webm'];

  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds 500MB limit (${formatFileSize(file.size)})` };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!supportedExtensions.includes(extension)) {
    return { valid: false, error: `Unsupported format. Supported: ${supportedExtensions.join(', ')}` };
  }

  if (!supportedTypes.includes(file.type) && !supportedExtensions.includes(extension)) {
    return { valid: false, error: 'Unsupported video format' };
  }

  return { valid: true };
}

export function createVideoPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
    video.src = url;
  });
}

export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const metadata: VideoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        size: file.size,
        name: file.name,
        type: file.type,
      };
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to extract video metadata'));
    };
    video.src = url;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(seconds: number): string {
  return formatDuration(seconds);
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED':
      return 'text-red-400 bg-red-500/20 border-red-500/30';
    case 'LIKELY_AUTHENTIC':
      return 'text-green-400 bg-green-500/20 border-green-500/30';
    case 'POSSIBLE_MANIPULATION':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    case 'INCONCLUSIVE':
      return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    default:
      return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED':
      return 'Likely AI-Generated';
    case 'LIKELY_AUTHENTIC':
      return 'Likely Authentic';
    case 'POSSIBLE_MANIPULATION':
      return 'Possible Manipulation';
    case 'INCONCLUSIVE':
      return 'Inconclusive';
    default:
      return 'Unknown';
  }
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'LIKELY_AI_GENERATED':
      return '🤖';
    case 'LIKELY_AUTHENTIC':
      return '✅';
    case 'POSSIBLE_MANIPULATION':
      return '⚠️';
    case 'INCONCLUSIVE':
      return '❓';
    default:
      return '❓';
  }
}