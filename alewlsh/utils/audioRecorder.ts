// utils/audioRecorder.ts
export interface RecordingConfig {
  intervalSeconds: number; // e.g., 15
  maxDurationMinutes?: number; // Safety limit
  onClipSaved?: (clipIndex: number, path: string) => void;
  onError?: (error: Error) => void;
  onStopped?: () => void;
}

export class AutoIntervalRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private clipIndex = 0;
  private isRecording = false;
  private config: RecordingConfig;
  private userId: string;
  private alertId: string;

  constructor(config: RecordingConfig, userId: string, alertId: string) {
    this.config = { ...config, intervalSeconds: config.intervalSeconds ?? 15 };
    this.userId = userId;
    this.alertId = alertId;
  }

  async start(stream: MediaStream): Promise<void> {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.clipIndex = 0;
    
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 64000
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.audioChunks.push(event.data);
    };

    this.mediaRecorder.onstop = async () => {
      if (this.audioChunks.length > 0) {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.saveClip(blob);
        this.audioChunks = [];
      }
    };

    this.mediaRecorder.start(1000);
    
    // Start interval timer
    this.intervalId = setInterval(() => {
      this.saveCurrentClip();
    }, this.config.intervalSeconds * 1000);

    // Safety auto-stop
    if (this.config.maxDurationMinutes) {
      setTimeout(() => { if (this.isRecording) this.stop(); }, 
        this.config.maxDurationMinutes * 60 * 1000);
    }
  }

  private async saveCurrentClip(): Promise<void> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
    this.mediaRecorder.stop();
    setTimeout(() => {
      if (this.isRecording && this.mediaRecorder?.state === 'inactive') {
        this.audioChunks = [];
        this.mediaRecorder.start(1000);
      }
    }, 100);
  }

  private async saveClip(blob: Blob): Promise<void> {
    const clipIndex = this.clipIndex++;
    const fileName = `clip-${clipIndex}-${Date.now()}.webm`;
    const storagePath = `${this.userId}/${this.alertId}/${fileName}`;
    
    try {
      // Upload to your existing emergency-audio bucket
      const { supabase } = await import('@/services/supabase');
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('emergency-audio')
        .upload(storagePath, blob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;
      
      // Save metadata
      await this.saveMetadata({
        clipIndex,
        storagePath,
        durationSeconds: this.config.intervalSeconds,
        fileSizeBytes: blob.size
      });
      
      this.config.onClipSaved?.(clipIndex, storagePath);
      
    } catch (error) {
      console.error('Clip save failed:', error);
      this.config.onError?.(error as Error);
      // Flag as corrupted for later review
      await this.saveMetadata({
        clipIndex,
        storagePath: `${storagePath}.failed`,
        durationSeconds: this.config.intervalSeconds,
        fileSizeBytes: blob.size,
        isCorrupted: true
      });
    }
  }

  private async saveMetadata(data: {
    clipIndex: number;
    storagePath: string;
    durationSeconds: number;
    fileSizeBytes: number;
    isCorrupted?: boolean;
  }) {
    const { supabase } = await import('@/services/supabase');
    const { error } = await supabase.from('alert_recordings').insert({
      alert_id: this.alertId,
      user_id: this.userId,
      clip_index: data.clipIndex,
      storage_path: data.storagePath,
      duration_seconds: data.durationSeconds,
      file_size_bytes: data.fileSizeBytes,
      is_corrupted: data.isCorrupted || false
    });
    if (error) throw error;
  }

  stop(): void {
    if (!this.isRecording) return;
    this.isRecording = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Save final clip
    if (this.audioChunks.length > 0) {
      const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.saveClip(blob);
      this.audioChunks = [];
    }
    
    this.mediaRecorder?.stream?.getTracks().forEach(track => track.stop());
    this.config.onStopped?.();
  }

  isRunning(): boolean { return this.isRecording; }
  getClipCount(): number { return this.clipIndex; }
}