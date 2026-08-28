import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { formatDuration, formatTimeWithMs } from '../utils/video-helpers';

export default function ClipTrimmerModal({ video, translations, onSave, onClose }) {
  const t = (key, params = {}) => {
    let str = translations[key] || key;
    Object.entries(params).forEach(([k, v]) => {
      str = str.replaceAll(`{${k}}`, String(v));
    });
    return str;
  };

  const videoRef = useRef(null);
  const totalDuration = Math.max(0.1, video.duration || 1);

  const [startTime, setStartTime] = useState(video.trim?.start || 0);
  const [endTime, setEndTime] = useState(video.trim?.end || totalDuration);
  const [currentTime, setCurrentTime] = useState(video.trim?.start || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingTrimmedRange, setIsPlayingTrimmedRange] = useState(false);

  // Initialize playback position
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
    }
  }, []);

  // Time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // If previewing trimmed range and reached endTime, loop or pause
    if (isPlayingTrimmedRange && curr >= endTime) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      setIsPlayingTrimmedRange(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const playTrimmedRange = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    videoRef.current.play();
    setIsPlaying(true);
    setIsPlayingTrimmedRange(true);
  };

  const seekTo = (time) => {
    const clamped = Math.max(0, Math.min(totalDuration, time));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    }
  };

  const handleStartChange = (val) => {
    const num = Math.max(0, Math.min(endTime - 0.2, parseFloat(val) || 0));
    setStartTime(num);
    seekTo(num);
  };

  const handleEndChange = (val) => {
    const num = Math.min(totalDuration, Math.max(startTime + 0.2, parseFloat(val) || totalDuration));
    setEndTime(num);
    seekTo(num);
  };

  const setStartToCurrent = () => {
    if (currentTime < endTime - 0.1) {
      setStartTime(currentTime);
    }
  };

  const setEndToCurrent = () => {
    if (currentTime > startTime + 0.1) {
      setEndTime(currentTime);
    }
  };

  const handleReset = () => {
    setStartTime(0);
    setEndTime(totalDuration);
    seekTo(0);
  };

  const handleApply = () => {
    const isFullVideo = startTime <= 0.05 && endTime >= totalDuration - 0.05;
    onSave({
      start: startTime,
      end: endTime,
      isFullVideo,
    });
  };

  const trimmedLength = Math.max(0, endTime - startTime);
  const startPercent = (startTime / totalDuration) * 100;
  const endPercent = (endTime / totalDuration) * 100;
  const currentPercent = (currentTime / totalDuration) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-2xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-[#C8DFDB] dark:border-[#1e344b] bg-white dark:bg-[#131f2d] flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#C8DFDB] dark:border-[#1e344b] flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#eaf2f7] dark:bg-[#16273a] text-[#3368A0] dark:text-[#66A3BF] flex items-center justify-center border border-[#C8DFDB] dark:border-[#20364d]">
              <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#192a3e] dark:text-[#F2EFE7] leading-tight">
                {t('trimmer.modalTitle')}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#4a5d72] dark:text-[#adc5d8] truncate max-w-[200px] sm:max-w-md">
                {video.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg text-[#66A3BF] hover:text-[#192a3e] dark:hover:text-[#F2EFE7] hover:bg-[#F2EFE7] dark:hover:bg-[#1a293a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          {/* Video Player */}
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-inner aspect-video max-h-44 sm:max-h-64 md:max-h-72 mx-auto flex items-center justify-center border border-[#C8DFDB] dark:border-[#20364d]">
            <video
              ref={videoRef}
              src={video.objectUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              playsInline
              className="w-full h-full object-contain"
            />
            {/* Play/Pause Center Overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm hover:scale-110 hover:bg-[#3368A0] transition-all opacity-80 hover:opacity-100 shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />}
            </button>
          </div>

          {/* Custom Dual Scrubber Track */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex justify-between text-[11px] sm:text-xs text-[#4a5d72] dark:text-[#adc5d8] font-mono">
              <span>{formatDuration(startTime)}</span>
              <span className="font-semibold text-[#3368A0] dark:text-[#66A3BF]">{formatTimeWithMs(currentTime)}</span>
              <span>{formatDuration(endTime)}</span>
            </div>

            {/* Visual Timeline Bar */}
            <div className="relative h-6 sm:h-7 bg-[#e8e4d8] dark:bg-[#0c1520] rounded-lg sm:rounded-xl overflow-hidden select-none border border-[#C8DFDB] dark:border-[#20364d]">
              {/* Active Trimmed Range Highlight */}
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-r from-[#3368A0] to-[#66A3BF] opacity-70 border-x-2 border-[#C8DFDB]"
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(1, endPercent - startPercent)}%`
                }}
              />

              {/* Playhead Marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-[#3368A0] dark:bg-[#C8DFDB] shadow-md z-10 -ml-0.5"
                style={{ left: `${currentPercent}%` }}
              />
            </div>

            {/* Range Inputs */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
              <div>
                <label className="text-[10px] sm:text-[11px] font-semibold text-[#4a5d72] dark:text-[#adc5d8] uppercase tracking-wider block mb-0.5">
                  {t('trimmer.startTime')}
                </label>
                <input
                  type="range"
                  min="0"
                  max={totalDuration}
                  step="0.05"
                  value={startTime}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="w-full accent-[#3368A0] cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] sm:text-[11px] font-semibold text-[#4a5d72] dark:text-[#adc5d8] uppercase tracking-wider block mb-0.5 text-right">
                  {t('trimmer.endTime')}
                </label>
                <input
                  type="range"
                  min="0"
                  max={totalDuration}
                  step="0.05"
                  value={endTime}
                  onChange={(e) => handleEndChange(e.target.value)}
                  className="w-full accent-[#3368A0] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Precision Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#F2EFE7]/80 dark:bg-[#0c1520]/60 border border-[#C8DFDB] dark:border-[#20364d] text-xs">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={setStartToCurrent}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1e344b] border border-[#C8DFDB] dark:border-[#20364d] hover:border-[#3368A0] dark:hover:border-[#66A3BF] font-medium text-[#192a3e] dark:text-[#F2EFE7] transition-colors shadow-sm text-center text-[11px] sm:text-xs"
              >
                {t('trimmer.setStartHere')}
              </button>

              <button
                type="button"
                onClick={setEndToCurrent}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1e344b] border border-[#C8DFDB] dark:border-[#20364d] hover:border-[#3368A0] dark:hover:border-[#66A3BF] font-medium text-[#192a3e] dark:text-[#F2EFE7] transition-colors shadow-sm text-center text-[11px] sm:text-xs"
              >
                {t('trimmer.setEndHere')}
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] sm:text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-[#C8DFDB]/60 dark:border-[#20364d]">
              <span className="text-[#4a5d72] dark:text-[#adc5d8] font-medium">
                {t('trimmer.clipLength')}: <strong className="text-[#3368A0] dark:text-[#66A3BF] font-bold">{formatDuration(trimmedLength)}</strong>
              </span>
              <span className="text-[#C8DFDB] dark:text-[#20364d]">|</span>
              <span className="text-[#66A3BF] dark:text-[#adc5d8]">
                {t('trimmer.originalLength')}: {formatDuration(totalDuration)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-t border-[#C8DFDB] dark:border-[#1e344b] bg-[#F2EFE7]/50 dark:bg-[#0c1520]/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={playTrimmedRange}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-[#3368A0] dark:text-[#66A3BF] bg-[#eaf2f7] dark:bg-[#16273a] hover:bg-[#dbe7f2] dark:hover:bg-[#1e344b] border border-[#C8DFDB] dark:border-[#20364d] transition-colors"
            >
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{t('trimmer.previewRange')}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-medium text-[#4a5d72] dark:text-[#adc5d8] hover:text-[#192a3e] dark:hover:text-[#F2EFE7] transition-colors"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{t('trimmer.resetTrim')}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl text-[#4a5d72] dark:text-[#adc5d8] hover:bg-[#F2EFE7] dark:hover:bg-[#1a293a] transition-colors"
            >
              {t('trimmer.cancel')}
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl text-white bg-[#3368A0] hover:bg-[#285586] shadow-md shadow-[#3368A0]/25 active:scale-[0.98] transition-all"
            >
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t('trimmer.saveTrim')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
