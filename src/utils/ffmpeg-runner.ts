import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import type { VideoMetadata } from './video-helpers';

export type MergeProgressStage = 
  | 'init'
  | 'loading'
  | 'processing'
  | 'normalizing'
  | 'finalizing'
  | 'complete';

export interface MergeProgressUpdate {
  stage: MergeProgressStage;
  percent: number;
  message?: string;
}

export type ProgressCallback = (update: MergeProgressUpdate) => void;

export interface MergeResult {
  blob: Blob;
  url: string;
  size: number;
  filename: string;
}

let ffmpegInstance: FFmpeg | null = null;
let isEngineLoading = false;

/**
 * Loads and returns the singleton FFmpeg instance using single-threaded WebAssembly core.
 */
export async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (isEngineLoading) {
    // Wait for in-progress load
    while (isEngineLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpegInstance && ffmpegInstance.loaded) {
      return ffmpegInstance;
    }
  }

  isEngineLoading = true;
  const ffmpeg = new FFmpeg();

  try {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    // Convert to Blob URLs to bypass cross-origin worker script restrictions
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg.wasm:', error);
    ffmpegInstance = null;
    throw new Error('WebAssembly FFmpeg engine failed to load. Please check your browser compatibility.');
  } finally {
    isEngineLoading = false;
  }
}

/**
 * Execute the two-stage video merge pipeline:
 * 1. Fast-path demuxer concat (stream copy)
 * 2. Transcode fallback concat (standardizing dimensions, codecs, framerates)
 */
export async function mergeVideos(
  videoList: VideoMetadata[],
  onProgress?: ProgressCallback
): Promise<MergeResult> {
  if (!videoList || videoList.length < 2) {
    throw new Error('At least 2 video clips are required for merging.');
  }

  const report = (stage: MergeProgressStage, percent: number, message?: string) => {
    if (onProgress) {
      onProgress({ stage, percent: Math.min(100, Math.max(0, Math.round(percent))), message });
    }
  };

  report('init', 5, 'Initializing WebAssembly engine...');
  const ffmpeg = await getFFmpeg();

  const totalDuration = videoList.reduce((acc, v) => acc + (v.duration || 1), 0);
  const inputFiles: string[] = [];

  // Setup progress listener
  const progressHandler = ({ progress, time }: { progress: number; time?: number }) => {
    if (typeof progress === 'number' && progress > 0) {
      // Scale progress from 25% to 90%
      const scaled = 25 + Math.round(progress * 65);
      report('processing', Math.min(90, scaled));
    } else if (typeof time === 'number' && totalDuration > 0) {
      const timeInSec = time / 1000000; // time in microseconds
      const calculated = 25 + Math.round((timeInSec / totalDuration) * 65);
      report('processing', Math.min(90, calculated));
    }
  };

  ffmpeg.on('progress', progressHandler);

  try {
    // Step 1: Write input files to virtual filesystem
    report('loading', 15, `Loading ${videoList.length} video files into virtual memory...`);
    
    for (let i = 0; i < videoList.length; i++) {
      const item = videoList[i];
      const extension = item.name.split('.').pop()?.toLowerCase() || 'mp4';
      const virtualFilename = `input_${i}.${extension}`;
      inputFiles.push(virtualFilename);

      const fileData = await fetchFile(item.file);
      await ffmpeg.writeFile(virtualFilename, fileData);
      
      const loadPercent = 15 + Math.round(((i + 1) / videoList.length) * 10);
      report('loading', loadPercent);
    }

    // Step 2: Attempt Stage 1 - Fast Stream Copy Concat
    report('processing', 30, 'Attempting fast stream-copy concat...');
    
    // Generate concat text file with trim inpoint / outpoint if specified
    const concatLines: string[] = [];
    for (let i = 0; i < inputFiles.length; i++) {
      concatLines.push(`file '${inputFiles[i]}'`);
      const trim = videoList[i].trim;
      if (trim) {
        if (trim.start > 0) {
          concatLines.push(`inpoint ${trim.start.toFixed(3)}`);
        }
        if (trim.end < (videoList[i].duration || 999999)) {
          concatLines.push(`outpoint ${trim.end.toFixed(3)}`);
        }
      }
    }
    const concatListContent = concatLines.join('\n');
    await ffmpeg.writeFile('concat_list.txt', concatListContent);

    let mergeSuccess = false;
    const outputFilename = 'output.mp4';

    try {
      const exitCode = await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_list.txt',
        '-c', 'copy',
        '-movflags', '+faststart',
        outputFilename
      ]);

      if (exitCode === 0) {
        // Verify output exists and is not empty
        const testData = await ffmpeg.readFile(outputFilename);
        if (testData && (testData as Uint8Array).byteLength > 1024) {
          mergeSuccess = true;
        }
      }
    } catch (streamCopyErr) {
      console.warn('Fast stream-copy failed, falling back to transcoding concat pipeline...', streamCopyErr);
    }

    // Step 3: Stage 2 Fallback - Transcode Concat with Scale Normalization
    if (!mergeSuccess) {
      report('normalizing', 35, 'Normalizing video streams and transcoding...');
      
      // Clean up previous output if any
      try {
        await ffmpeg.deleteFile(outputFilename);
      } catch (_) {}

      // Find max resolution to avoid unnecessary downscaling
      const targetWidth = Math.max(...videoList.map(v => v.width || 1280), 1280);
      const targetHeight = Math.max(...videoList.map(v => v.height || 720), 720);
      // Ensure dimensions are even numbers for H.264
      const safeWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
      const safeHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

      // Build FFmpeg command arguments with filter_complex
      const filterInputs: string[] = [];
      const filterConcat: string[] = [];
      const execArgs: string[] = [];

      for (let i = 0; i < inputFiles.length; i++) {
        const trim = videoList[i].trim;
        if (trim) {
          execArgs.push('-ss', trim.start.toFixed(3));
          execArgs.push('-to', trim.end.toFixed(3));
        }
        execArgs.push('-i', inputFiles[i]);
        // Scale, pad to maintain aspect ratio with black bars if needed, and normalize SAR + sample rate
        filterInputs.push(
          `[${i}:v]scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=decrease,pad=${safeWidth}:${safeHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`
        );
        filterConcat.push(`[v${i}][${i}:a?]`);
      }

      const filterComplex = `${filterInputs.join('; ')}; ${filterConcat.join('')}concat=n=${inputFiles.length}:v=1:a=1[outv][outa]`;

      execArgs.push(
        '-filter_complex', filterComplex,
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '24',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ac', '2',
        '-ar', '44100',
        '-movflags', '+faststart',
        outputFilename
      );

      const transcodeExitCode = await ffmpeg.exec(execArgs);
      if (transcodeExitCode !== 0) {
        throw new Error(`Transcode concat failed with exit code ${transcodeExitCode}`);
      }
    }

    // Step 4: Finalizing & reading output file
    report('finalizing', 95, 'Generating downloadable MP4 video...');
    const data = await ffmpeg.readFile(outputFilename);
    let outputBlob: Blob;
    if (typeof data === 'string') {
      outputBlob = new Blob([data], { type: 'video/mp4' });
    } else {
      const copyBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(copyBuffer).set(data);
      outputBlob = new Blob([copyBuffer], { type: 'video/mp4' });
    }
    const url = URL.createObjectURL(outputBlob);

    report('complete', 100, 'Merge complete!');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const resultFilename = `merged-video-${timestamp}.mp4`;

    return {
      blob: outputBlob,
      url,
      size: outputBlob.size,
      filename: resultFilename,
    };
  } finally {
    // Cleanup virtual filesystem to prevent memory leaks
    ffmpeg.off('progress', progressHandler);

    for (const filename of inputFiles) {
      try {
        await ffmpeg.deleteFile(filename);
      } catch (_) {}
    }
    try {
      await ffmpeg.deleteFile('concat_list.txt');
    } catch (_) {}
    try {
      await ffmpeg.deleteFile('output.mp4');
    } catch (_) {}
  }
}
