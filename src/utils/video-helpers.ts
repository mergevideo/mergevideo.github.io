export interface VideoMetadata {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  duration: number;
  formattedDuration: string;
  width: number;
  height: number;
  resolution: string;
  thumbnailUrl: string;
  objectUrl: string;
  trim?: {
    start: number;
    end: number;
  };
}

/**
 * Format seconds with decimals into mm:ss.s or hh:mm:ss.s
 */
export function formatTimeWithMs(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00.0';
  const totalSeconds = Math.floor(seconds);
  const ms = Math.floor((seconds - totalSeconds) * 10);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${ms}`;
  }
  return `${pad(mins)}:${pad(secs)}.${ms}`;
}

/**
 * Format raw byte size into human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.round(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Generate a thumbnail and extract metadata from a video File
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  const objectUrl = URL.createObjectURL(file);
  const id = `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    // Timeout safety
    const timeout = setTimeout(() => {
      // Fallback if metadata loading hangs
      resolve({
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatBytes(file.size),
        duration: 0,
        formattedDuration: '00:00',
        width: 1920,
        height: 1080,
        resolution: '1920x1080',
        thumbnailUrl: '',
        objectUrl,
      });
    }, 8000);

    video.onloadedmetadata = () => {
      // Seek to 1s or middle to get a non-black frame
      const targetTime = Math.min(1.0, video.duration > 0.5 ? video.duration / 2 : 0);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        
        // Scale down thumbnail for fast memory footprint
        const maxThumbWidth = 320;
        const scale = Math.min(1, maxThumbWidth / width);
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

          resolve({
            id,
            file,
            name: file.name,
            size: file.size,
            formattedSize: formatBytes(file.size),
            duration: video.duration || 0,
            formattedDuration: formatDuration(video.duration || 0),
            width,
            height,
            resolution: `${width}x${height}`,
            thumbnailUrl,
            objectUrl,
          });
          return;
        }
      } catch (err) {
        console.warn('Canvas thumbnail extraction failed, using fallback', err);
      }

      // Fallback if canvas context fails
      resolve({
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatBytes(file.size),
        duration: video.duration || 0,
        formattedDuration: formatDuration(video.duration || 0),
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        resolution: `${video.videoWidth || 1920}x${video.videoHeight || 1080}`,
        thumbnailUrl: '',
        objectUrl,
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      resolve({
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatBytes(file.size),
        duration: 0,
        formattedDuration: '00:00',
        width: 1920,
        height: 1080,
        resolution: '1920x1080',
        thumbnailUrl: '',
        objectUrl,
      });
    };
  });
}

/**
 * Check if a file is an accepted video format
 */
export function isSupportedVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const acceptedExtensions = ['.mp4', '.m4v', '.webm', '.mov', '.mkv', '.avi', '.ts', '.flv', '.wmv'];
  const name = file.name.toLowerCase();
  return acceptedExtensions.some(ext => name.endsWith(ext));
}
