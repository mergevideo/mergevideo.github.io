import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UploadCloud,
  Film,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  HardDrive,
  Sparkles,
  GripVertical,
  Plus,
  Loader2,
  Scissors
} from 'lucide-react';
import {
  extractVideoMetadata,
  formatBytes,
  formatDuration,
  isSupportedVideoFile
} from '../utils/video-helpers';
import { mergeVideos } from '../utils/ffmpeg-runner';
import ClipTrimmerModal from './ClipTrimmerModal.jsx';

export default function VideoMergerWorkspace({ translations, lang = 'en' }) {
  const t = (key, params = {}) => {
    let str = translations[key] || key;
    Object.entries(params).forEach(([k, v]) => {
      str = str.replaceAll(`{${k}}`, String(v));
    });
    return str;
  };

  const [videos, setVideos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: 'init', percent: 0, message: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [trimmingVideo, setTrimmingVideo] = useState(null);

  const fileInputRef = useRef(null);
  const addMoreInputRef = useRef(null);

  // Calculate totals taking into account active trim ranges
  const totalDurationSeconds = videos.reduce((acc, v) => {
    if (v.trim) {
      return acc + Math.max(0.1, v.trim.end - v.trim.start);
    }
    return acc + (v.duration || 0);
  }, 0);
  const totalSizeBytes = videos.reduce((acc, v) => acc + (v.size || 0), 0);

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setIsLoadingFiles(true);

    const validFiles = Array.from(fileList).filter(isSupportedVideoFile);

    if (validFiles.length === 0) {
      setError(t('error.invalidFile'));
      setIsLoadingFiles(false);
      return;
    }

    try {
      const newVideoItems = await Promise.all(
        validFiles.map(file => extractVideoMetadata(file))
      );
      setVideos(prev => [...prev, ...newVideoItems]);
    } catch (err) {
      console.error('Error extracting video metadata:', err);
      setError(t('error.default'));
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Reordering handlers
  const moveVideo = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= videos.length) return;
    const updated = [...videos];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setVideos(updated);
  };

  const removeVideo = (id) => {
    setVideos(prev => {
      const removed = prev.find(v => v.id === id);
      if (removed?.objectUrl) {
        URL.revokeObjectURL(removed.objectUrl);
      }
      return prev.filter(v => v.id !== id);
    });
  };

  const clearAllVideos = () => {
    videos.forEach(v => {
      if (v.objectUrl) URL.revokeObjectURL(v.objectUrl);
    });
    setVideos([]);
    setError(null);
    setResult(null);
  };

  // HTML5 Drag-and-drop reordering inside queue
  const handleItemDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...videos];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setVideos(updated);
  };

  const handleItemDragEnd = () => {
    setDraggedIndex(null);
  };

  // Trimming handlers
  const handleSaveTrim = ({ start, end, isFullVideo }) => {
    if (!trimmingVideo) return;
    setVideos(prev =>
      prev.map(v => {
        if (v.id === trimmingVideo.id) {
          if (isFullVideo) {
            const { trim, ...rest } = v;
            return rest;
          }
          return {
            ...v,
            trim: { start, end },
          };
        }
        return v;
      })
    );
    setTrimmingVideo(null);
  };

  // Video Merge Trigger
  const handleMerge = async () => {
    if (videos.length < 2) {
      setError(t('error.minFiles'));
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress({ stage: 'init', percent: 2, message: t('progress.stageInit') });

    try {
      const mergeOutput = await mergeVideos(videos, ({ stage, percent, message }) => {
        let localizedMessage = message;
        if (stage === 'init') localizedMessage = t('progress.stageInit');
        if (stage === 'loading') localizedMessage = t('progress.stageLoading', { count: videos.length });
        if (stage === 'processing') localizedMessage = t('progress.stageProcessing');
        if (stage === 'normalizing') localizedMessage = t('progress.stageNormalizing');
        if (stage === 'finalizing') localizedMessage = t('progress.stageFinalizing');
        if (stage === 'complete') localizedMessage = t('progress.stageComplete');

        setProgress({ stage, percent, message: localizedMessage || message });
      });

      setResult(mergeOutput);
      setIsProcessing(false);

      // Trigger celebration confetti with palette colors
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3368A0', '#66A3BF', '#C8DFDB', '#f59e0b']
        });
      } catch (_) {}
    } catch (err) {
      console.error('Merge execution failed:', err);
      setError(err.message || t('error.default'));
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }
    setResult(null);
    setError(null);
    setProgress({ stage: 'init', percent: 0, message: '' });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-1 sm:px-0">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,.mp4,.mov,.webm,.mkv,.avi"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={addMoreInputRef}
        type="file"
        multiple
        accept="video/*,.mp4,.mov,.webm,.mkv,.avi"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Trimmer Modal */}
      {trimmingVideo && (
        <ClipTrimmerModal
          video={trimmingVideo}
          translations={translations}
          onSave={handleSaveTrim}
          onClose={() => setTrimmingVideo(null)}
        />
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5 sm:gap-3 text-rose-800 dark:text-rose-200 animate-in fade-in slide-in-from-top-2 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="flex-1 font-medium">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-semibold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: SUCCESS RESULT */}
      {result ? (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#66A3BF]/40 bg-gradient-to-b from-white/95 to-[#F2EFE7]/60 dark:from-[#131f2d] dark:to-[#0c1520] shadow-xl animate-in zoom-in-95 duration-200">
          <div className="text-center mb-5 sm:mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#C8DFDB]/50 dark:bg-[#1e344b] text-[#3368A0] dark:text-[#66A3BF] mb-2 sm:mb-3 ring-6 sm:ring-8 ring-[#C8DFDB]/20 dark:ring-[#1e344b]/40">
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-[#192a3e] dark:text-[#F2EFE7]">
              {t('result.successTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-[#4a5d72] dark:text-[#adc5d8] mt-1 max-w-lg mx-auto">
              {t('result.successSubtitle')}
            </p>
          </div>

          {/* Video Preview Player */}
          <div className="max-w-2xl mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl bg-black border border-[#C8DFDB] dark:border-[#20364d] mb-4 sm:mb-6">
            <video
              src={result.url}
              controls
              playsInline
              className="w-full aspect-video bg-black"
            />
          </div>

          {/* Metadata Pill Summary */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-medium text-[#4a5d72] dark:text-[#adc5d8] mb-6 sm:mb-8">
            <span className="px-3 py-1.5 rounded-full bg-white dark:bg-[#131f2d] border border-[#C8DFDB] dark:border-[#20364d] flex items-center gap-1.5 shadow-sm">
              <Film className="w-3.5 h-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
              {t('result.outputFormat')}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white dark:bg-[#131f2d] border border-[#C8DFDB] dark:border-[#20364d] flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
              {t('result.outputDuration', { duration: formatDuration(totalDurationSeconds) })}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white dark:bg-[#131f2d] border border-[#C8DFDB] dark:border-[#20364d] flex items-center gap-1.5 shadow-sm">
              <HardDrive className="w-3.5 h-3.5 text-[#3368A0] dark:text-[#66A3BF]" />
              {t('result.outputSize', { size: formatBytes(result.size) })}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <a
              href={result.url}
              download={result.filename}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 rounded-xl font-semibold text-white bg-[#3368A0] hover:bg-[#285586] shadow-lg shadow-[#3368A0]/25 active:scale-[0.98] transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              {t('result.downloadButton')}
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-xl font-medium text-[#192a3e] dark:text-[#F2EFE7] bg-[#F2EFE7] dark:bg-[#1a293a] hover:bg-[#e5e0d3] dark:hover:bg-[#22364c] border border-[#C8DFDB] dark:border-[#20364d] active:scale-[0.98] transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              {t('result.mergeAnother')}
            </button>
          </div>

          <div className="text-center mt-5 sm:mt-6">
            <span className="text-[10px] sm:text-[11px] text-[#66A3BF] dark:text-[#adc5d8] inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#3368A0] dark:text-[#66A3BF]" />
              {t('result.privacyAssurance')}
            </span>
          </div>
        </div>
      ) : isProcessing ? (
        /* VIEW 2: MERGING PROGRESS OVERLAY */
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-12 border border-[#66A3BF]/40 text-center shadow-2xl animate-in fade-in duration-200">
          <div className="max-w-md mx-auto">
            <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-[#C8DFDB]/60 dark:border-[#1e344b]"></div>
              <div
                className="absolute inset-0 rounded-full border-4 border-[#3368A0] dark:border-[#66A3BF] border-t-transparent animate-spin"
                style={{ animationDuration: '1.5s' }}
              ></div>
              <span className="text-base sm:text-lg font-bold text-[#3368A0] dark:text-[#66A3BF]">
                {progress.percent}%
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#192a3e] dark:text-[#F2EFE7] mb-1.5 sm:mb-2">
              {t('progress.title')}
            </h2>
            <p className="text-xs text-[#4a5d72] dark:text-[#adc5d8] mb-4 sm:mb-6">
              {t('progress.subtitle')}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-[#e8e4d8] dark:bg-[#0c1520] rounded-full h-3 mb-4 overflow-hidden p-0.5 border border-[#C8DFDB] dark:border-[#20364d]">
              <div
                className="h-full bg-gradient-to-r from-[#3368A0] via-[#66A3BF] to-[#C8DFDB] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, progress.percent)}%` }}
              ></div>
            </div>

            {/* Stage Message */}
            <p className="text-xs sm:text-sm font-medium text-[#192a3e] dark:text-[#F2EFE7] min-h-[24px] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#3368A0] dark:text-[#66A3BF]" />
              {progress.message || t('progress.stageProcessing')}
            </p>
          </div>
        </div>
      ) : videos.length === 0 ? (
        /* VIEW 3: EMPTY DROPZONE */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group cursor-pointer rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center border-2 border-dashed transition-all duration-200 relative overflow-hidden ${
            isDragging
              ? 'border-[#3368A0] bg-[#3368A0]/5 dropzone-active'
              : 'border-[#C8DFDB] dark:border-[#20364d] hover:border-[#3368A0]/70 dark:hover:border-[#66A3BF]/70 hover:bg-white/60 dark:hover:bg-[#131f2d]/60 bg-white/40 dark:bg-[#131f2d]/30'
          }`}
        >
          <div className="relative z-10 flex flex-col items-center justify-center max-w-lg mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#eaf2f7] dark:bg-[#16273a] text-[#3368A0] dark:text-[#66A3BF] flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 group-hover:bg-[#3368A0] group-hover:text-white transition-all duration-200 shadow-sm border border-[#C8DFDB]/60 dark:border-[#20364d]">
              <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <h3 className="text-lg sm:text-2xl font-bold text-[#192a3e] dark:text-[#F2EFE7] mb-1.5 sm:mb-2">
              {isDragging ? t('workspace.dropzoneDropPrompt') : t('workspace.dropzoneTitle')}
            </h3>

            <p className="text-xs sm:text-sm text-[#4a5d72] dark:text-[#adc5d8] mb-5 sm:mb-6">
              {t('workspace.dropzoneSubtitle')}
            </p>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-white bg-[#3368A0] group-hover:bg-[#285586] shadow-md shadow-[#3368A0]/25 active:scale-[0.98] transition-all text-xs sm:text-sm pointer-events-none"
            >
              <Plus className="w-4 h-4" />
              {t('workspace.dropzoneButton')}
            </button>

            <div className="mt-5 sm:mt-6 flex items-center gap-2 text-[10px] sm:text-[11px] font-medium text-[#66A3BF] dark:text-[#adc5d8]">
              <span>{t('workspace.formatNotice')}</span>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 4: QUEUE MANAGER & REORDER WORKSPACE */
        <div className="space-y-4 sm:space-y-6">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl glass-card">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#192a3e] dark:text-[#F2EFE7] flex items-center gap-2">
                <Film className="w-4 h-4 sm:w-5 sm:h-5 text-[#3368A0] dark:text-[#66A3BF]" />
                {t('workspace.queueTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#4a5d72] dark:text-[#adc5d8]">
                {t('workspace.queueSubtitle')}
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => addMoreInputRef.current?.click()}
                disabled={isLoadingFiles}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg sm:rounded-xl text-[#3368A0] dark:text-[#66A3BF] bg-[#eaf2f7] dark:bg-[#16273a] hover:bg-[#dbe7f2] dark:hover:bg-[#1e344b] transition-all border border-[#C8DFDB] dark:border-[#20364d]"
              >
                {isLoadingFiles ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{t('workspace.dropzoneAddMore')}</span>
              </button>

              <button
                type="button"
                onClick={clearAllVideos}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg sm:rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('workspace.clearAll')}</span>
              </button>
            </div>
          </div>

          {/* Video Cards List (Drag & Drop Reordering & Trimming) */}
          <div className="space-y-2.5 sm:space-y-3">
            {videos.map((item, index) => {
              const hasTrim = Boolean(item.trim);
              const effectiveDuration = item.trim
                ? Math.max(0.1, item.trim.end - item.trim.start)
                : item.duration;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, index)}
                  onDragOver={(e) => handleItemDragOver(e, index)}
                  onDragEnd={handleItemDragEnd}
                  className={`glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-4 transition-all duration-150 group ${
                    draggedIndex === index
                      ? 'opacity-40 border-[#3368A0] scale-[0.99]'
                      : 'hover:border-[#66A3BF]/60 dark:hover:border-[#66A3BF]/60'
                  }`}
                >
                  {/* Drag Handle & Order Badge */}
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[#66A3BF] cursor-grab active:cursor-grabbing flex-shrink-0">
                    <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#66A3BF] group-hover:text-[#3368A0] dark:group-hover:text-[#F2EFE7]" />
                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-[#F2EFE7] dark:bg-[#1e344b] text-[#192a3e] dark:text-[#F2EFE7] text-[10px] sm:text-xs font-bold flex items-center justify-center border border-[#C8DFDB] dark:border-[#20364d]">
                      {index + 1}
                    </span>
                  </div>

                  {/* Thumbnail Preview */}
                  <div className="w-16 sm:w-28 h-11 sm:h-16 rounded-lg sm:rounded-xl bg-slate-900 flex-shrink-0 overflow-hidden relative border border-[#C8DFDB] dark:border-[#20364d]">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#66A3BF]">
                        <Film className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                    )}
                    <span className={`absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded text-white text-[9px] sm:text-[10px] font-mono leading-tight ${
                      hasTrim ? 'bg-[#3368A0] font-bold' : 'bg-black/80'
                    }`}>
                      {formatDuration(effectiveDuration)}
                    </span>
                  </div>

                  {/* File Information & Trim Badge */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#192a3e] dark:text-[#F2EFE7] truncate">
                      {item.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                      <span className="text-[10px] sm:text-[11px] font-medium text-[#4a5d72] dark:text-[#adc5d8]">
                        {item.formattedSize}
                      </span>
                      <span className="text-[#C8DFDB] dark:text-[#20364d] hidden xs:inline">•</span>
                      <span className="text-[10px] sm:text-[11px] font-medium text-[#4a5d72] dark:text-[#adc5d8] hidden xs:inline">
                        {item.resolution}
                      </span>

                      {hasTrim && item.trim && (
                        <>
                          <span className="text-[#C8DFDB] dark:text-[#20364d] hidden sm:inline">•</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#eaf2f7] dark:bg-[#16273a] text-[#3368A0] dark:text-[#66A3BF] text-[9px] sm:text-[10px] font-bold border border-[#C8DFDB] dark:border-[#20364d]">
                            <Scissors className="w-2.5 h-2.5" />
                            <span>{formatDuration(item.trim.start)} → {formatDuration(item.trim.end)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Trimmer, Up/Down Arrow Reordering & Delete */}
                  <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
                    {/* Trim Button */}
                    <button
                      type="button"
                      onClick={() => setTrimmingVideo(item)}
                      title={t('workspace.trimButton')}
                      className={`p-1.5 sm:p-2 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                        hasTrim
                          ? 'bg-[#dbe7f2] text-[#3368A0] dark:bg-[#1e344b] dark:text-[#66A3BF]'
                          : 'text-[#4a5d72] dark:text-[#adc5d8] hover:text-[#3368A0] hover:bg-[#eaf2f7] dark:hover:bg-[#1a293a]'
                      }`}
                    >
                      <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden md:inline text-xs">{t('workspace.trimButton')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => moveVideo(index, -1)}
                      disabled={index === 0}
                      title={t('workspace.moveUp')}
                      className="p-1.5 sm:p-2 rounded-lg text-[#4a5d72] dark:text-[#adc5d8] hover:text-[#3368A0] hover:bg-[#eaf2f7] dark:hover:bg-[#1a293a] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveVideo(index, 1)}
                      disabled={index === videos.length - 1}
                      title={t('workspace.moveDown')}
                      className="p-1.5 sm:p-2 rounded-lg text-[#4a5d72] dark:text-[#adc5d8] hover:text-[#3368A0] hover:bg-[#eaf2f7] dark:hover:bg-[#1a293a] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeVideo(item.id)}
                      title={t('workspace.removeClip')}
                      className="p-1.5 sm:p-2 rounded-lg text-[#66A3BF] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Drop Addition Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => addMoreInputRef.current?.click()}
            className={`cursor-pointer rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-dashed transition-all ${
              isDragging
                ? 'border-[#3368A0] bg-[#3368A0]/5 dropzone-active'
                : 'border-[#C8DFDB] dark:border-[#20364d] hover:border-[#3368A0]/60 bg-white/30 dark:bg-[#131f2d]/30'
            }`}
          >
            <p className="text-xs font-medium text-[#4a5d72] dark:text-[#adc5d8] flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4 text-[#3368A0] dark:text-[#66A3BF]" />
              {t('workspace.dropzoneAddMore')}
            </p>
          </div>

          {/* Bottom Summary Bar & Big Merge Action Button */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#C8DFDB] dark:border-[#1e344b] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto flex flex-wrap items-center justify-around sm:justify-start gap-2.5 sm:gap-4 text-xs sm:text-sm text-[#4a5d72] dark:text-[#adc5d8]">
              <div className="flex items-center gap-1.5">
                <Film className="w-4 h-4 text-[#3368A0] dark:text-[#66A3BF]" />
                <span className="font-semibold text-[#192a3e] dark:text-[#F2EFE7]">{t('workspace.clipsCount', { count: videos.length })}</span>
              </div>
              <span className="text-[#C8DFDB] dark:text-[#20364d]">|</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#3368A0] dark:text-[#66A3BF]" />
                <span>{t('workspace.totalDuration')}: <strong className="text-[#192a3e] dark:text-[#F2EFE7]">{formatDuration(totalDurationSeconds)}</strong></span>
              </div>
              <span className="text-[#C8DFDB] dark:text-[#20364d] hidden md:inline">|</span>
              <div className="hidden md:flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[#3368A0] dark:text-[#66A3BF]" />
                <span>{t('workspace.totalSize')}: <strong className="text-[#192a3e] dark:text-[#F2EFE7]">{formatBytes(totalSizeBytes)}</strong></span>
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <button
                type="button"
                onClick={handleMerge}
                disabled={videos.length < 2 || isProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#3368A0] to-[#285586] hover:from-[#285586] hover:to-[#1e4167] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#3368A0]/25 active:scale-[0.98] transition-all text-xs sm:text-sm"
              >
                <Sparkles className="w-4 h-4 text-[#C8DFDB]" />
                {t('workspace.mergeButton', { count: videos.length })}
              </button>
            </div>
          </div>

          {videos.length === 1 && (
            <p className="text-center text-xs text-[#3368A0] dark:text-[#66A3BF] font-medium">
              {t('workspace.minFilesHint')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
