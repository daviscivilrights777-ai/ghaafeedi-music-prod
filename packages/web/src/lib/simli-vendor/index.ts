// ============================================================
// FILE: src/lib/simli-vendor/index.ts
//
// VENDOR COPY of simli-client@3.0.2 — converted from CJS to ESM.
// This replaces the npm package import entirely so Rollup never
// has to deal with the CJS ./Client relative require that caused:
//   "Could not resolve './Client' from './Client?commonjs-external'"
//
// Do NOT import from 'simli-client' anywhere in the codebase.
// Import from '@/lib/simli-vendor' instead.
// ============================================================

// ─── LogLevel ─────────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  ERROR = 2,
  CRITICAL = 3,
}

// ─── Logger ───────────────────────────────────────────────────

export class Logger {
  currentLevel: LogLevel;
  destination: string | null;
  session_id: string | null;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.currentLevel = level;
    this.destination = null;
    this.session_id = null;
  }

  formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const destination = this.destination ?? "not_received";
    const sessionId = this.session_id ?? "not_received";
    return `SimliClient | ${timestamp} | ${level} | ${destination}/${sessionId} | ${message}`;
  }

  log(level: LogLevel, levelName: string, message: string, ...args: unknown[]) {
    if (level < this.currentLevel) return;
    const formattedMessage = this.formatMessage(levelName, message);
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]) { this.log(LogLevel.DEBUG, "DEBUG", message, ...args); }
  info(message: string, ...args: unknown[]) { this.log(LogLevel.INFO, "INFO", message, ...args); }
  error(message: string, ...args: unknown[]) { this.log(LogLevel.ERROR, "ERROR", message, ...args); }
  critical(message: string, ...args: unknown[]) { this.log(LogLevel.CRITICAL, "CRITICAL", message, ...args); }
  setLevel(level: LogLevel) { this.currentLevel = level; }
  getLevel(): LogLevel { return this.currentLevel; }
}

// ─── BaseSignaling ────────────────────────────────────────────

export interface ISignaling {
  connect(connected: () => void): Promise<void>;
  disconnect(): void;
  send(data: string | Uint8Array): void;
  sendOffer(offer: RTCSessionDescriptionInit): void;
  sendSignal(data: string): void;
  sendAudioData(audioData: Uint8Array): void;
  sendAudioDataImmediate(audioData: Uint8Array): void;
  wsConnection: WebSocket;
}

// ─── WebSocketSignaling ───────────────────────────────────────

export class WebSocketSignaling implements ISignaling {
  wsURL: URL;
  wsConnection: WebSocket;
  logger: Logger;

  constructor(wsURL: URL, logger: Logger) {
    this.wsURL = wsURL;
    this.wsConnection = new WebSocket(wsURL.toString());
    this.wsConnection.addEventListener("message", (message) => logger.debug(message.data));
    this.logger = logger;
  }

  async connect(connected: () => void): Promise<void> {
    this.wsConnection.onopen = connected;
  }

  disconnect() { this.wsConnection.close(); }

  send(data: string | Uint8Array) {
    if (this.wsConnection.readyState !== WebSocket.OPEN) {
      throw `Invalid State, WS Connection ${this.wsConnection.readyState}`;
    }
    this.wsConnection.send(data);
  }

  sendOffer(offer: RTCSessionDescriptionInit) { this.send(JSON.stringify(offer)); }
  sendSignal(data: string) { this.send(data); }

  sendAudioData(audioData: Uint8Array) {
    if (this.logger.getLevel() === LogLevel.DEBUG)
      this.logger.debug("Sent Audio of length: " + (audioData.length / 32000).toString());
    this.send(audioData);
  }

  sendAudioDataImmediate(audioData: Uint8Array) {
    if (this.logger.getLevel() === LogLevel.DEBUG)
      this.logger.debug("Sent Audio for immediate playback: " + (audioData.length / 32000).toString());
    const asciiStr = "PLAY_IMMEDIATE";
    const encoder = new TextEncoder();
    const strBytes = encoder.encode(asciiStr);
    const buffer = new Uint8Array(strBytes.length + audioData.length);
    buffer.set(strBytes, 0);
    buffer.set(audioData, strBytes.length);
    this.send(buffer);
  }
}

// ─── BaseTransport helpers ────────────────────────────────────

export function register_destination(logger: Logger, serialized_info: string) {
  const parsed = JSON.parse(serialized_info);
  logger.destination = parsed.destination;
  logger.session_id = parsed.session_id;
}

export interface ITransport {
  signalingConnection: ISignaling;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export async function handleMessage(transport: ITransport, message: MessageEvent) {
  const firstToken = message.data.toUpperCase().split(" ")[0];
  switch (firstToken) {
    case "START": break;
    case "ACK": transport.emit("ack"); break;
    case "STOP":
      transport.disconnect();
      transport.emit("stop");
      break;
    case "CLOSING":
    case "RATE":
    case "ERROR":
    case "ERROR:":
      transport.disconnect();
      transport.emit("error", message.data);
      // fall through intentional (matches original)
      // eslint-disable-next-line no-fallthrough
    case "SPEAK": transport.emit("speaking"); break;
    case "SILENT": transport.emit("silent"); break;
    default:
      if (firstToken.includes("SDP") || firstToken.includes("LIVEKIT")) {
        transport.emit("connection_info", message.data);
      } else if (firstToken.includes("VIDEO_METADATA")) {
        transport.emit("video_info", message.data);
      } else if (firstToken.includes("ENDFRAME")) {
        transport.emit("stop");
        transport.disconnect();
      } else if (firstToken.includes("DESTINATION")) {
        transport.emit("destination", message.data);
      } else {
        transport.emit("unknown", message.data);
      }
  }
}

// ─── P2PTransport ─────────────────────────────────────────────

export class P2PTransport implements ITransport {
  videoElementAnchor: HTMLVideoElement;
  audioElementAnchor: HTMLAudioElement;
  signalingConnection: WebSocketSignaling;
  session_token: string;
  pc: RTCPeerConnection;
  events: Map<string, Set<(...args: unknown[]) => void>>;
  logger: Logger;
  iceCandidateCount: number;
  previousIceCandidateCount: number;
  iceTimeout: ReturnType<typeof setTimeout> | null;
  websocketPromise: Promise<string>;
  websocketReject: ((reason?: unknown) => void) | null;

  constructor(
    simliBaseWSURL: string,
    session_token: string,
    enableSFU: boolean,
    iceServers: RTCIceServer[],
    videoElementAnchor: HTMLVideoElement,
    audioElementAnchor: HTMLAudioElement,
    logger: Logger,
    failSignal: (...args: unknown[]) => void,
  ) {
    this.logger = logger;
    this.events = new Map();
    this.on("startup_error", failSignal);
    this.session_token = session_token;
    const wsURL = new URL(simliBaseWSURL + "/compose/webrtc/p2p");
    wsURL.searchParams.set("session_token", session_token);
    wsURL.searchParams.set("enableSFU", String(enableSFU));
    this.on("destination", (info) => register_destination(this.logger, info as string));
    this.signalingConnection = new WebSocketSignaling(wsURL, this.logger);
    this.websocketReject = null;
    this.websocketPromise = new Promise((resolve, reject) => {
      this.websocketReject = reject;
      this.signalingConnection.connect(() => {
        resolve("success");
        this.logger.debug("P2P WebSocket Connected");
      });
    });
    this.signalingConnection.wsConnection.onmessage = (message) => { handleMessage(this, message); };
    this.signalingConnection.wsConnection.onerror = () => {
      this.emit("startup_error", "Websocket Failed");
      if (this.websocketReject) { this.websocketReject("Websocket Failed"); this.websocketReject = null; }
    };
    this.on("connection_info", (info) => this.registerPeerInfo(info as string));
    this.videoElementAnchor = videoElementAnchor;
    this.audioElementAnchor = audioElementAnchor;
    this.iceCandidateCount = 0;
    this.previousIceCandidateCount = 0;
    this.iceTimeout = null;
    this.pc = new window.RTCPeerConnection({ sdpSemantics: "unified-plan", iceServers } as RTCConfiguration);
    this.pc.addTransceiver("audio", { direction: "recvonly" });
    this.pc.addTransceiver("video", { direction: "recvonly" });
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(callback);
  }
  off(event: string, callback: (...args: unknown[]) => void) {
    this.events.get(event)?.delete(callback);
  }
  emit(event: string, ...args: unknown[]) {
    this.events.get(event)?.forEach((cb) => { try { cb(...args); } catch { this.logger.error("CALLBACK FAILED"); } });
  }

  async connect(): Promise<void> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.waitForIceGathering();
    this.setupPeerConnectionListeners();
    await this.websocketPromise;
    if (this.pc.localDescription) this.signalingConnection.sendOffer(this.pc.localDescription);
  }

  async disconnect(): Promise<void> {
    this.logger.info("Disconnecting");
    try { this.signalingConnection.sendSignal("DONE"); } catch { this.logger.error("FAILED TO SEND FINAL MESSAGE"); }
    try { this.signalingConnection.disconnect(); } catch { this.logger.error("SIGNALING ALREADY DISCONNECTED"); }
    try { this.pc.close(); } catch { this.logger.error("LOCAL PEER ALREADY CLOSED"); }
  }

  async registerPeerInfo(serialized_info: string) {
    const info = JSON.parse(serialized_info);
    if (info.sdp && info.type === "answer") {
      await this.pc.setRemoteDescription(new RTCSessionDescription(info));
    } else {
      this.disconnect();
      this.emit("error", "Invalid Join Info, Contact Simli For Support");
    }
  }

  async waitForIceGathering(): Promise<void> {
    this.iceCandidateCount = 0;
    this.previousIceCandidateCount = 0;
    if (this.pc.iceGatheringState === "complete") return;
    return new Promise((resolve, reject) => {
      if (!this.iceTimeout) {
        this.iceTimeout = setTimeout(() => reject(new Error("ICE gathering timeout")), 10000);
      }
      const check = () => {
        if (this.pc.iceGatheringState === "complete" || this.iceCandidateCount === this.previousIceCandidateCount) {
          if (this.iceTimeout) clearTimeout(this.iceTimeout);
          resolve();
        } else {
          this.previousIceCandidateCount = this.iceCandidateCount;
          setTimeout(check, 150);
        }
      };
      check();
    });
  }

  setupPeerConnectionListeners() {
    this.pc.addEventListener("track", (evt) => {
      if (evt.track.kind === "video") {
        this.videoElementAnchor.srcObject = evt.streams[0];
        this.videoElementAnchor.requestVideoFrameCallback(() => { this.emit("start"); });
      } else if (evt.track.kind === "audio" && this.audioElementAnchor) {
        this.audioElementAnchor.srcObject = evt.streams[0];
      }
    });
    this.pc.onicecandidate = (event) => { if (event.candidate !== null) this.iceCandidateCount += 1; };
  }
}

// ─── LivekitTransport ─────────────────────────────────────────
// We use dynamic import for livekit-client to avoid pulling it into
// the critical path. The Room/RoomEvent/Track imports are typed as any
// since livekit-client is also CJS-heavy — we only use it at runtime.

export class LivekitTransport implements ITransport {
  videoElementAnchor: HTMLVideoElement;
  audioElementAnchor: HTMLAudioElement;
  signalingConnection: WebSocketSignaling;
  session_token: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pc: any; // livekit Room
  logger: Logger;
  events: Map<string, Set<(...args: unknown[]) => void>>;
  websocketPromise: Promise<string>;
  websocketReject: ((reason?: unknown) => void) | null;

  constructor(
    simliBaseWSURL: string,
    session_token: string,
    videoElementAnchor: HTMLVideoElement,
    audioElementAnchor: HTMLAudioElement,
    logger: Logger,
    failSignal: (...args: unknown[]) => void,
  ) {
    this.logger = logger;
    this.events = new Map();
    this.on("startup_error", failSignal);
    this.session_token = session_token;
    const wsURL = new URL(simliBaseWSURL + "/compose/webrtc/livekit");
    wsURL.searchParams.set("session_token", session_token);
    this.signalingConnection = new WebSocketSignaling(wsURL, this.logger);
    this.on("destination", (info) => register_destination(this.logger, info as string));
    this.websocketReject = null;
    this.websocketPromise = new Promise((resolve, reject) => {
      this.websocketReject = reject;
      this.signalingConnection.connect(() => {
        resolve("success");
        this.logger.debug("LK WebSocket Connected");
      });
    });
    this.signalingConnection.wsConnection.onmessage = (message) => { handleMessage(this, message); };
    this.signalingConnection.wsConnection.onerror = () => {
      this.emit("startup_error", "Websocket Failed");
      if (this.websocketReject) { this.websocketReject("Websocket Failed"); this.websocketReject = null; }
    };
    this.on("connection_info", (info) => this.join_lk_room(info as string));
    this.videoElementAnchor = videoElementAnchor;
    this.audioElementAnchor = audioElementAnchor;
    // Room is created lazily in connect() after livekit-client dynamic import
    this.pc = null;
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(callback);
    this.logger.debug("Registered Callback for Event: " + event);
  }
  off(event: string, callback: (...args: unknown[]) => void) {
    if (!this.events.has(event)) throw "Event Not Registered";
    this.events.get(event)!.delete(callback);
  }
  emit(event: string, ...args: unknown[]) {
    this.logger.debug("Event: " + event);
    this.events.get(event)?.forEach((cb) => cb(...args));
  }

  async connect(): Promise<void> {
    this.logger.info("Connecting");
    // Use livekit-client UMD global loaded via <script> tag in index.html.
    // Never import it as an ES module — it's CJS-heavy and breaks Rollup.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lk = (window as any).LivekitClient;
    if (!lk) throw new Error("LivekitClient UMD not loaded — check index.html script tag");
    this.pc = new lk.Room({ adaptiveStream: false, dynacast: true });
    this.setupConnectionStateHandler(lk);
    await this.websocketPromise;
  }

  async disconnect(): Promise<void> {
    this.logger.info("Disconnecting");
    try { this.signalingConnection.sendSignal("DONE"); } catch { this.logger.error("FAILED TO SEND FINAL MESSAGE"); }
    try { this.signalingConnection.disconnect(); } catch { this.logger.error("SIGNALING ALREADY DISCONNECTED"); }
    try { if (this.pc) await this.pc.disconnect(); } catch { this.logger.error("LOCAL PEER ALREADY CLOSED"); }
  }

  async join_lk_room(serialized_info: string) {
    const info = JSON.parse(serialized_info);
    if (info.livekit_url && info.livekit_token) {
      await this.pc.connect(info.livekit_url, info.livekit_token);
    } else {
      this.disconnect();
      this.emit("error", "Invalid Join Info, Contact Simli For Support");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupConnectionStateHandler(lk: any) {
    this.pc.on(lk.RoomEvent.Disconnected, () => { this.disconnect(); });
    this.pc.on(lk.RoomEvent.Connected, () => {});
    this.pc.on(lk.RoomEvent.TrackSubscribed, (track: unknown, _pub: unknown, _part: unknown) => {
      const t = track as { kind: string; attach: (el: HTMLElement) => void };
      this.logger.debug("Track Received: " + t.kind);
      if (t.kind === lk.Track.Kind.Video) {
        t.attach(this.videoElementAnchor);
        this.videoElementAnchor.requestVideoFrameCallback(() => { this.emit("start"); });
      } else if (t.kind === lk.Track.Kind.Audio) {
        t.attach(this.audioElementAnchor);
      }
    });
  }
}

// ─── AudioProcessor worklet source ───────────────────────────

function AudioProcessor(buffer: number): string {
  if (buffer <= 0) throw "Invalid Buffer Size, Can't be negative";
  if (Math.floor(buffer) - buffer !== 0) throw "Invalid Buffer Size, Can't be a float";
  return `
    class AudioProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.buffer = new Int16Array(${buffer});
        this.bufferIndex = 0;
      }
      process(inputs, outputs, parameters) {
        const input = inputs[0];
        const inputChannel = input[0];
        if (inputChannel) {
          for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex] = Math.max(-32768, Math.min(32767, Math.round(inputChannel[i] * 32767)));
            this.bufferIndex++;
            if (this.bufferIndex === this.buffer.length) {
              this.port.postMessage({ type: 'audioData', data: this.buffer.slice(0, this.bufferIndex) });
              this.bufferIndex = 0;
            }
          }
        }
        return true;
      }
    }
    registerProcessor('audio-processor', AudioProcessor);
  `;
}

// ─── API helpers ──────────────────────────────────────────────

export async function generateSimliSessionToken(
  request: { config: unknown; apiKey: string },
  SimliURL = "https://api.simli.ai",
): Promise<unknown> {
  const url = `${SimliURL}/compose/token`;
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(request.config),
    headers: { "Content-Type": "application/json", "x-simli-api-key": request.apiKey },
  });
  if (!response.ok) throw await response.text();
  return response.json();
}

export async function generateIceServers(
  apiKey: string,
  SimliURL = "https://api.simli.ai",
): Promise<RTCIceServer[]> {
  try {
    const response = await fetch(`${SimliURL}/compose/ice`, {
      headers: { "Content-Type": "application/json", "x-simli-api-key": apiKey },
      method: "GET",
    });
    if (!response.ok) throw new Error(`SIMLI: HTTP error! status: ${response.status}`);
    const iceServers = await response.json();
    if (!iceServers || iceServers.length === 0) throw new Error("SIMLI: No ICE servers returned");
    return iceServers;
  } catch {
    return [{ urls: ["stun:stun.l.google.com:19302"] }];
  }
}

// ─── SimliClient ──────────────────────────────────────────────

export class SimliClient {
  session_token: string;
  transport: "livekit" | "p2p";
  signaling: string;
  videoElement: HTMLVideoElement;
  audioElement: HTMLAudioElement;
  audioBufferSize: number;
  connection!: ITransport;
  connectionTimeout!: ReturnType<typeof setTimeout>;
  connectionResolve!: () => void;
  connectionReject!: (reason?: unknown) => void;
  connectionPromise!: Promise<void>;
  sourceNode: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null;
  audioWorklet: AudioWorkletNode | null;
  MAX_RETRY_ATTEMPTS = 10;
  RETRY_DELAY = 2000;
  CONNECTION_TIMEOUT_MS = 15000;
  retryAttempt = 0;
  SimliWSURL: string;
  audioContext: AudioContext;
  logger: Logger;
  iceServers: RTCIceServer[];
  persistent_events: Map<string, Set<(...args: unknown[]) => void>>;
  failReason: string | null;
  shouldStop: boolean;

  constructor(
    session_token: string,
    videoElement: HTMLVideoElement,
    audioElement: HTMLAudioElement,
    iceServers: RTCIceServer[],
    logLevel: LogLevel = LogLevel.DEBUG,
    transport_mode: "livekit" | "p2p" = "p2p",
    signaling = "websockets",
    SimliWSURL = "wss://api.simli.ai",
    audioBufferSize = 3000,
  ) {
    if (audioBufferSize <= 0) throw "Invalid Buffer Size, Can't be negative";
    if (Math.floor(audioBufferSize) - audioBufferSize !== 0) throw "Invalid Buffer Size, Can't be a float";
    if (!(SimliWSURL.startsWith("ws://") || SimliWSURL.startsWith("wss://")) || SimliWSURL.endsWith("/"))
      throw "Invalid Simli WS URL";

    this.audioBufferSize = audioBufferSize;
    this.session_token = session_token;
    this.transport = transport_mode;
    this.signaling = signaling;
    this.SimliWSURL = SimliWSURL;
    this.videoElement = videoElement;
    this.audioElement = audioElement;
    this.iceServers = iceServers;
    this.logger = new Logger(logLevel);
    this.sourceNode = null;
    this.audioWorklet = null;
    this.failReason = null;
    this.shouldStop = false;
    this.persistent_events = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

    let resolveFn!: () => void;
    let rejectFn!: (reason?: unknown) => void;
    this.connectionPromise = new Promise((resolve, reject) => { resolveFn = resolve; rejectFn = reject; });
    this.connectionResolve = resolveFn;
    this.connectionReject = rejectFn;
    this.connectionTimeout = setTimeout(() => this.connectionReject("CONNECTION TIMED OUT"), this.CONNECTION_TIMEOUT_MS);

    this._initConnection();
  }

  private _initConnection() {
    switch (this.transport) {
      case "livekit":
        this.connection = new LivekitTransport(
          this.SimliWSURL, this.session_token,
          this.videoElement, this.audioElement,
          this.logger, this.connectionReject,
        );
        break;
      case "p2p":
        if (!this.iceServers || this.iceServers.length === 0) throw "Ice Servers Required for P2P Mode";
        this.connection = new P2PTransport(
          this.SimliWSURL, this.session_token, true,
          this.iceServers, this.videoElement, this.audioElement,
          this.logger, this.connectionReject,
        );
        break;
      default:
        throw new Error("Not Implemented Yet");
    }
    this.connection.on("start", () => { this.connectionResolve(); clearTimeout(this.connectionTimeout); });
    this.connection.on("unknown", (msg) => this.logger.debug("UNKNOWN MESSAGE FROM SERVER: " + msg));
    this.connection.on("error", (msg) => { this.failReason = msg as string; this.connectionReject(msg); });
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.persistent_events.has(event)) this.persistent_events.set(event, new Set());
    this.persistent_events.get(event)!.add(callback);
    this.logger.debug("Registered Callback for Event: " + event);
    this.connection.on(event, callback);
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    if (!this.persistent_events.has(event)) throw "Event Not Registered";
    this.persistent_events.get(event)!.delete(callback);
    this.connection.off(event, callback);
  }

  resetConnections(videoElement: HTMLVideoElement, audioElement: HTMLAudioElement, iceServers: RTCIceServer[]) {
    this.failReason = null;
    let resolveFn!: () => void;
    let rejectFn!: (reason?: unknown) => void;
    this.connectionPromise = new Promise((resolve, reject) => { resolveFn = resolve; rejectFn = reject; });
    this.connectionResolve = resolveFn;
    this.connectionReject = rejectFn;
    this.connectionTimeout = setTimeout(() => this.connectionReject("Connection Timed Out"), this.CONNECTION_TIMEOUT_MS);
    this.videoElement = videoElement;
    this.audioElement = audioElement;
    this.iceServers = iceServers;
    this._initConnection();
    // Re-register all user event handlers on the new connection
    this.persistent_events.forEach((callbacks, event) => {
      callbacks.forEach((cb) => this.connection.on(event, cb));
    });
  }

  async start(): Promise<void> {
    if (this.shouldStop) throw new Error("Disconnect Already Called, Can't reuse same SimliClient — create a new instance");
    try {
      await this.connection.connect();
      await this.connectionPromise;
      this.retryAttempt = 0;
    } catch (error) {
      if (this.failReason) throw error;
      if (this.retryAttempt >= this.MAX_RETRY_ATTEMPTS) throw new Error("Too Many Retry Attempts — failed to connect");
      if (this.shouldStop) { this.shouldStop = false; throw new Error("Called Disconnect Before A Connection succeeded"); }
      this.logger.error("FAILED: " + error);
      await this.connection.disconnect();
      await new Promise((r) => setTimeout(r, this.RETRY_DELAY));
      this.retryAttempt += 1;
      if (this.retryAttempt > 2) this.transport = "livekit";
      this.resetConnections(this.videoElement, this.audioElement, this.iceServers);
      await this.start();
    }
  }

  async stop(): Promise<void> {
    this.shouldStop = true;
    await this.connection.disconnect();
  }

  listenToMediastreamTrack(stream: MediaStreamTrack) {
    const source = this.audioContext.createMediaStreamSource(new MediaStream([stream]));
    this.sourceNode = source;
    this._attachSourceToWorklet(this.audioContext, source);
  }

  listenToAudioElement(audioEl: HTMLAudioElement) {
    const source = this.audioContext.createMediaElementSource(audioEl);
    this._attachSourceToWorklet(this.audioContext, source);
  }

  private _attachSourceToWorklet(
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode,
  ) {
    audioContext.audioWorklet
      .addModule(URL.createObjectURL(new Blob([AudioProcessor(this.audioBufferSize)], { type: "application/javascript" })))
      .then(() => {
        this.audioWorklet = new AudioWorkletNode(audioContext, "audio-processor");
        if (!this.audioWorklet) throw new Error("SIMLI: AudioWorklet not initialized");
        source.connect(this.audioWorklet);
        this.audioWorklet.port.onmessage = (event) => {
          if (event.data.type === "audioData") {
            (this.connection.signalingConnection as WebSocketSignaling).sendAudioData(new Uint8Array(event.data.data.buffer));
          }
        };
      });
  }

  ClearBuffer = () => {
    (this.connection.signalingConnection as WebSocketSignaling).sendSignal("SKIP");
  };

  sendAudioData(audioData: Uint8Array) {
    (this.connection.signalingConnection as WebSocketSignaling).sendAudioData(audioData);
  }

  sendAudioDataImmediate(audioData: Uint8Array) {
    (this.connection.signalingConnection as WebSocketSignaling).sendAudioDataImmediate(audioData);
  }
}
