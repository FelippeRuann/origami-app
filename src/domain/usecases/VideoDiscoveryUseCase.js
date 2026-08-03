import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, getCountFromServer,
  query, where, limit, orderBy, startAfter,
  updateDoc, doc,
} from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Quota tracking ────────────────────────────────────────────────────────────
// YouTube has NO official quota API. We track usage ourselves in Firestore.
// Costs: search.list = 100 units | videos.list = 1 unit | RSS/Invidious = 0 units
// Daily limit: 10,000 units (Google default free tier)

const DAILY_QUOTA = 10000;
const SAFETY_MARGIN = 300; // keep 300 units as buffer before stopping
const QUOTA_COSTS = { SEARCH: 100, VIDEOS_DETAILS: 1, RSS: 0, INVIDIOUS: 0 };

// Invidious public instances (fallback when YouTube quota is low)
const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://iv.melmac.space',
];

export class VideoDiscoveryUseCase {

  static TRUSTED_CHANNELS = [
    { name: 'OrigamiByBoice',       channelId: 'UC6M87S6vGv80_eZfK0OjkxQ' },
    { name: 'Tadashi Mori',         channelId: 'UCkS-U7Iovn660_9VAtO8wVQ' },
    { name: 'Jo Nakashima',         channelId: 'UC3ICC_79U9UonN9p96p9WpW' },
    { name: 'Mariano Zavala',       channelId: 'UCU7v-O6_pUfbeR9X_zQoNug' },
    { name: 'SakuSaku Origami',     channelId: 'UCGjPia7f9rQOQ750hpxH-MA' },
    { name: 'Kade Chan',            channelId: 'UCFscP-YIdN-v7_D1Pq8YfCg' },
    { name: 'Origami Oritai',       channelId: 'UCyL_L6qS_yq3zY7y9U3U9-Q' },
  ];

  // Full list of search terms — each is used exactly once (tracked in Firestore)
  static SEARCH_TERMS = [
    "Satoshi Kamiya origami tutorial",
    "Robert Lang origami instructions",
    "Hojyo Takashi origami",
    "Kade Chan origami master",
    "Jason Ku origami tutorial",
    "Ancient Dragon origami tutorial",
    "Ryu Jin origami 3.5 instructions",
    "Origami Nazgul super complex",
    "Origami Phoenix 3.5 Satoshi Kamiya",
    "Godzilla origami complex tutorial",
    "Origami Samurai Helmet advanced",
    "Origami Grim Reaper complex",
    "Origami Hydra 2.0 tutorial",
    "Origami Pokemon advanced instructions",
    "Charizard origami tutorial Jo Nakashima",
    "Origami Bahamut tutorial",
    "Eric Joisel origami",
    "Satoshi Kamiya Pegasus instructions",
    "Origami Inoshikacho complex",
    "Origami White Whale Satoshi Kamiya",
    "Origami Unicorn Satoshi Kamiya",
    "Origami Western Dragon tutorial",
    "Shuki Kato origami tutorial",
    "Origami Giganotosaurus complex",
    "Origami Lion Satoshi Kamiya",
    "Origami Wizard Hojyo Takashi",
    "Origami Angel Hojyo Takashi",
    "origami crane easy beginner",
    "origami modular star tutorial",
    "origami flower beginner tutorial",
    "origami butterfly simple instructions",
    "origami elephant easy fold",
    "origami fox beginner step by step",
    "origami cat easy tutorial",
    "origami dragon beginner",
    "origami dinosaur tutorial step by step",
    "origami shark intermediate",
    "origami rose intermediate tutorial",
    "origami owl intermediate instructions",
    "origami wolf advanced tutorial",
  ];

  // ─── QUOTA MANAGEMENT ─────────────────────────────────────────────────────

  static async getQuotaStatus() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const raw = await AsyncStorage.getItem('@yt_quota');
      if (!raw) return { date: today, used: 0 };
      const stored = JSON.parse(raw);
      if (stored.date !== today) {
        const fresh = { date: today, used: 0 };
        await AsyncStorage.setItem('@yt_quota', JSON.stringify(fresh));
        return fresh;
      }
      return stored;
    } catch {
      return { date: '', used: 0 };
    }
  }

  static async trackQuotaUsage(units) {
    try {
      const current = await this.getQuotaStatus();
      await AsyncStorage.setItem('@yt_quota', JSON.stringify({
        date: current.date,
        used: (current.used || 0) + units,
      }));
    } catch {
      // Non-critical
    }
  }

  // ─── TERM ROTATION ────────────────────────────────────────────────────────

  static async _getSearchedTerms() {
    try {
      const raw = await AsyncStorage.getItem('@searched_terms');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  static async getNextUnusedTerm() {
    const used = await this._getSearchedTerms();
    return this.SEARCH_TERMS.find(t => !used.has(t)) || null;
  }

  static async getRemainingTermsCount() {
    const used = await this._getSearchedTerms();
    return Math.max(0, this.SEARCH_TERMS.length - used.size);
  }

  static async markTermAsSearched(term) {
    try {
      const used = await this._getSearchedTerms();
      used.add(term);
      await AsyncStorage.setItem('@searched_terms', JSON.stringify([...used]));
    } catch {
      // Non-critical
    }
  }

  // ─── DIFFICULTY CLASSIFICATION (keyword-based, no AI cost) ────────────────

  static classifyDifficulty(title, channelTitle, durationStr) {
    const t = (title || '').toLowerCase();
    const c = (channelTitle || '').toLowerCase();

    const hardSignals = [
      'satoshi kamiya', 'robert lang', 'hojyo takashi', 'kade chan', 'jason ku',
      'shuki kato', 'eric joisel', 'ancient dragon', 'ryu jin', 'nazgul',
      'phoenix 3.5', 'bahamut', 'giganotosaurus', 'super complex', 'ultra complex',
      'complex origami', 'opus', 'super-complex', 'mariano zavala',
    ];
    const easySignals = [
      'easy', 'beginner', 'simple', 'básico', 'iniciante', 'for kids', 'fácil',
      'traditional', 'crane', 'tsuru', 'boat', 'hat', 'heart', 'for children',
      'how to make a simple', '5 minutes', '3 minutes', '2 minutes', '1 minute',
    ];

    if (hardSignals.some(s => t.includes(s) || c.includes(s))) return 'hard';
    if (easySignals.some(s => t.includes(s))) return 'easy';

    // Duration fallback
    if (durationStr && durationStr !== 'Tutorial') {
      const parts = durationStr.split(':').map(Number);
      const minutes = parts.length === 3 ? parts[0] * 60 + parts[1] : parts[0] || 0;
      if (minutes < 8) return 'easy';
      if (minutes > 40) return 'hard';
    }

    return 'intermediate';
  }

  // ─── RSS DISCOVERY (free, no quota) ───────────────────────────────────────

  static async scanChannelsViaRSS(ytKey) {
    const allVideos = [];

    for (const channel of this.TRUSTED_CHANNELS) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
        const resp = await fetch(rssUrl);
        if (!resp.ok) continue;
        const xml = await resp.text();
        const parsed = this.parseRSSFeed(xml, channel.name);

        // Get durations via videos.list (1 unit per batch)
        if (parsed.length > 0 && ytKey) {
          const ids = parsed.map(v => v.id).join(',');
          try {
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${ytKey}`;
            const detailsResp = await fetch(detailsUrl);
            const detailsData = await detailsResp.json();
            if (detailsData.items) {
              const durMap = {};
              detailsData.items.forEach(v => { durMap[v.id] = v.contentDetails.duration; });
              parsed.forEach(v => {
                v.duration = durMap[v.id] ? this.formatISO8601Duration(durMap[v.id]) : 'Tutorial';
              });
              await this.trackQuotaUsage(QUOTA_COSTS.VIDEOS_DETAILS);
            }
          } catch {
            parsed.forEach(v => { v.duration = 'Tutorial'; });
          }
        }

        allVideos.push(...parsed);
      } catch (e) {
        console.warn(`RSS failed for ${channel.name}:`, e);
      }
    }

    return allVideos;
  }

  static parseRSSFeed(xmlText, channelName) {
    const videos = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entry = match[1];
      const videoId   = (entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
      const rawTitle  = (entry.match(/<title>(.*?)<\/title>/) || [])[1] || '';
      const title     = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      const published = (entry.match(/<published>(.*?)<\/published>/) || [])[1] || '';
      const desc      = (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '';

      if (videoId && title) {
        videos.push({
          id: videoId,
          title,
          description: desc.trim(),
          channelTitle: channelName,
          channelId: '',
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: 'Tutorial',
          published,
          source: 'rss',
        });
      }
    }
    return videos;
  }

  // ─── INVIDIOUS DISCOVERY (free fallback) ──────────────────────────────────

  static async searchViaInvidious(searchQuery, maxResults = 12) {
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const url = `${instance}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video&fields=videoId,title,description,author,authorId,lengthSeconds,videoThumbnails`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) continue;
        const data = await resp.json();
        if (!Array.isArray(data)) continue;

        return data.slice(0, maxResults).map(v => ({
          id: v.videoId,
          title: v.title,
          description: v.description || '',
          channelTitle: v.author,
          channelId: v.authorId,
          thumbnail: v.videoThumbnails?.find(t => t.quality === 'high')?.url
            || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          duration: this.formatSeconds(v.lengthSeconds || 0),
          source: 'invidious',
        }));
      } catch {
        continue; // Try next instance
      }
    }
    console.warn('All Invidious instances failed');
    return [];
  }

  static formatSeconds(seconds) {
    if (!seconds || seconds === 0) return 'Tutorial';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ─── YOUTUBE SEARCH (costs 100 units per call) ────────────────────────────

  static async searchYouTube(apiKey, searchQuery, maxResults, channelId = null) {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
    if (channelId) url += `&channelId=${channelId}`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.error) {
        if (data.error.message?.includes('quota') || data.error.errors?.[0]?.reason === 'quotaExceeded') {
          return 'QUOTA_EXCEEDED';
        }
        throw new Error(data.error.message);
      }

      await this.trackQuotaUsage(QUOTA_COSTS.SEARCH);

      const videoIds = data.items.map(item => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`;
      const detailsResp = await fetch(detailsUrl);
      const detailsData = await detailsResp.json();
      await this.trackQuotaUsage(QUOTA_COSTS.VIDEOS_DETAILS);

      const durMap = {};
      (detailsData.items || []).forEach(v => { durMap[v.id] = v.contentDetails.duration; });

      return data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        duration: durMap[item.id.videoId] ? this.formatISO8601Duration(durMap[item.id.videoId]) : 'Tutorial',
        source: 'youtube',
      }));
    } catch (err) {
      console.error('YouTube search error:', err);
      return [];
    }
  }

  // ─── AI ANALYSIS ──────────────────────────────────────────────────────────

  static async analyzeWithAI(ai, video) {
    const preClassified = this.classifyDifficulty(video.title, video.channelTitle, video.duration);

    let base64Data = null;
    try {
      const imageResp = await fetch(video.thumbnail);
      const blob = await imageResp.blob();
      base64Data = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch {
      // Thumbnail unavailable — proceed without image
    }

    try {
      const textPart = {
        text: `Analise este vídeo do YouTube:
Título: "${video.title}"
Canal: "${video.channelTitle}"
Duração: "${video.duration}"
Descrição: "${(video.description || '').slice(0, 300)}"

Você é especialista em origami. Determine se é um TUTORIAL REAL de dobradura de papel.

ACEITE APENAS se for: tutorial passo-a-passo mostrando como dobrar papel com as mãos (origami tradicional, modular, wetfolding, kirigami estruturado com dobras).

REJEITE se for qualquer um dos seguintes:
- Bijuteria ou acessório feito de papel ou inspirado em origami (colares, brincos, anéis, pulseiras)
- Recorte de papel sem dobras (papercutting, kirigami puro, scherenschnitte)
- Artesanato que não seja dobradura (decoupage, scrapbook, colagem, bordado, crochê, tricô, costura)
- "Origami" como nome de marca, produto, serviço, restaurante, bicicleta, móvel ou lugar
- Vlogs, reviews, unboxings, reações, hauls, música ambiente, stop-motion sem instrução, animações 3D
- Vídeo de resultado final sem ensinar os passos

DIFICULDADE — pré-análise sugeriu: "${preClassified}". Confirme ou corrija:
- "easy": crane, sapo, barco, chapéu, coração, títulos com easy/beginner/simple/fácil/iniciante, menos de 8 minutos
- "intermediate": flores, modelos médios, modular, 8–40 minutos
- "hard": mais de 40 min, modelos complexos, criadores Satoshi Kamiya / Robert Lang / Hojyo Takashi / Kade Chan / Eric Joisel, títulos com complex/super complex/advanced/opus

Retorne APENAS JSON:
{
  "isOrigami": boolean,
  "tags": string[],
  "difficulty": "easy" | "intermediate" | "hard",
  "summary": string
}`
      };

      const parts = [textPart];
      if (base64Data) {
        parts.push({ inlineData: { data: base64Data, mimeType: 'image/jpeg' } });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isOrigami:  { type: Type.BOOLEAN },
              tags:       { type: Type.ARRAY, items: { type: Type.STRING } },
              difficulty: { type: Type.STRING },
              summary:    { type: Type.STRING },
            },
            required: ['isOrigami'],
          },
        },
      });

      const clean = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch (err) {
      console.error('Gemini error:', err);
      // Fallback: reject if any non-origami keyword present, otherwise accept
      const lTitle = (video.title || '').toLowerCase();
      const lDesc = (video.description || '').toLowerCase();
      const rejected = this.REJECT_KEYWORDS.some(k => lTitle.includes(k) || lDesc.includes(k));
      return {
        isOrigami: !rejected,
        tags: ['origami'],
        difficulty: preClassified,
        summary: '',
      };
    }
  }

  // ─── DEDUPLICATION ────────────────────────────────────────────────────────

  static async checkIfExists(videoId) {
    if (!videoId) return false;
    const q1 = query(collection(db, 'community_videos'), where('videoId', '==', videoId));
    const q2 = query(collection(db, 'processed_video_checks'), where('videoId', '==', videoId));
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    return !s1.empty || !s2.empty;
  }

  static async checkIfTitleExists(title) {
    if (!title) return false;
    const normalized = title.trim();
    const q1 = query(collection(db, 'community_videos'), where('title', '==', normalized));
    const q2 = query(collection(db, 'processed_video_checks'), where('title', '==', normalized));
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    return !s1.empty || !s2.empty;
  }

  // ─── PROCESS & SAVE VIDEOS ────────────────────────────────────────────────

  // Keywords that indicate the video is NOT paper folding origami
  static REJECT_KEYWORDS = [
    // jewelry / accessories
    'jewelry', 'bijuteria', 'bijoux', 'jóia', 'joia', 'brinco', 'colar', 'pulseira', 'anel',
    'earring', 'necklace', 'bracelet', 'ring', 'accessory', 'accessories', 'acessório',
    // cutting / other paper crafts
    'kirigami', 'papercutting', 'paper cutting', 'paper sculpture', 'corte de papel',
    'decoupage', 'scrapbook', 'scrapbooking',
    // textile crafts
    'crochet', 'crochê', 'knitting', 'tricô', 'sewing', 'costura', 'embroidery', 'bordado',
    // "origami" as brand / product / place
    'origami bicycle', 'origami bike', 'origami chair', 'origami sofa', 'origami furniture',
    'origami restaurant', 'origami hotel', 'origami clothing', 'origami brand',
  ];

  static async processAndSaveVideos(videos, ai, maxSaves = 5) {
    const results = [];
    let saved = 0;

    // Deduplication in parallel to speed things up
    const dedupChecks = await Promise.all(
      videos.map(async v => ({
        v,
        exists: await this.checkIfExists(v.id) || await this.checkIfTitleExists(v.title),
      }))
    );
    const newVideos = dedupChecks.filter(c => !c.exists).map(c => c.v);

    for (const vid of newVideos) {
      if (saved >= maxSaves) {
        results.push({ id: vid.id, title: vid.title, status: 'limit_reached' });
        continue;
      }

      const lowTitle = (vid.title || '').toLowerCase();
      const lowDesc = (vid.description || '').toLowerCase();

      // 1. Positive pre-filter: must mention origami/folding concepts
      const keywords = ['origami', 'paper fold', 'dobradura', 'paper crane', 'dobrar papel'];
      if (!keywords.some(k => lowTitle.includes(k) || lowDesc.includes(k))) {
        results.push({ id: vid.id, title: vid.title, status: 'filtered' });
        continue;
      }

      // 2. Negative pre-filter: reject known non-origami categories immediately
      if (this.REJECT_KEYWORDS.some(k => lowTitle.includes(k) || lowDesc.includes(k))) {
        try {
          await addDoc(collection(db, 'processed_video_checks'), {
            videoId: vid.id || '', title: vid.title || '', status: 'rejected', addedAt: new Date(),
          });
        } catch { /* non-critical */ }
        results.push({ id: vid.id, title: vid.title, status: 'rejected' });
        continue;
      }

      let analysis;
      if (vid.source === 'rss' && this.TRUSTED_CHANNELS.some(c => c.name === vid.channelTitle)) {
        // Trusted channel via RSS — skip Gemini, use keyword classification
        const difficulty = this.classifyDifficulty(vid.title, vid.channelTitle, vid.duration);
        analysis = { isOrigami: true, tags: ['origami'], difficulty, summary: '' };
      } else {
        analysis = await this.analyzeWithAI(ai, vid);
        // Small delay to avoid Gemini rate limits
        await new Promise(r => setTimeout(r, 400));
      }

      if (analysis?.isOrigami) {
        await addDoc(collection(db, 'community_videos'), {
          videoId:      vid.id || '',
          title:        vid.title || 'Sem título',
          description:  vid.description || '',
          channelTitle: vid.channelTitle || 'Canal desconhecido',
          channelId:    vid.channelId || '',
          thumbnail:    vid.thumbnail || '',
          duration:     vid.duration || 'Tutorial',
          tags:         analysis.tags || [],
          difficulty:   analysis.difficulty || 'intermediate',
          addedAt:      new Date(),
          verifiedByAI: vid.source !== 'rss',
          source:       vid.source || 'youtube',
          aiSummary:    analysis.summary || '',
        });
        results.push({ id: vid.id, title: vid.title, status: 'saved', difficulty: analysis.difficulty });
        saved++;
      } else {
        try {
          await addDoc(collection(db, 'processed_video_checks'), {
            videoId: vid.id || '', title: vid.title || '', status: 'rejected', addedAt: new Date(),
          });
        } catch { /* non-critical */ }
        results.push({ id: vid.id, title: vid.title, status: 'rejected' });
      }
    }

    dedupChecks.filter(c => c.exists).forEach(c => {
      results.push({ id: c.v.id, title: c.v.title, status: 'skipped' });
    });

    return { results, saved };
  }

  // ─── SINGLE SCAN (manual trigger, one cycle) ─────────────────────────────

  static async scanAndSaveVideos() {
    const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const YT_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    if (!GEMINI_KEY) throw new Error('Chave Gemini não configurada.');

    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    let allVideos = [];

    // 1. RSS scan (free)
    const rssVideos = await this.scanChannelsViaRSS(YT_KEY);
    allVideos.push(...rssVideos);

    // 2. One YouTube/Invidious search with next unused term
    const quota = await this.getQuotaStatus();
    const canUseYouTube = YT_KEY && (quota.used + QUOTA_COSTS.SEARCH + QUOTA_COSTS.VIDEOS_DETAILS) <= (DAILY_QUOTA - SAFETY_MARGIN);
    const nextTerm = await this.getNextUnusedTerm();

    if (nextTerm) {
      let searchResults = [];
      if (canUseYouTube) {
        searchResults = await this.searchYouTube(YT_KEY, nextTerm, 12);
        if (searchResults === 'QUOTA_EXCEEDED') {
          await this.trackQuotaUsage(DAILY_QUOTA); // mark as exhausted
          searchResults = await this.searchViaInvidious(nextTerm);
        }
      } else {
        searchResults = await this.searchViaInvidious(nextTerm);
      }
      if (Array.isArray(searchResults) && searchResults.length > 0) {
        await this.markTermAsSearched(nextTerm);
        allVideos.push(...searchResults);
      }
    }

    // Deduplicate by ID
    allVideos = Array.from(new Map(allVideos.map(v => [v.id, v])).values());

    const { results } = await this.processAndSaveVideos(allVideos, ai, 5);
    return results;
  }

  // ─── AUTO SCAN UNTIL QUOTA (new: runs in loop) ───────────────────────────

  static async autoScanUntilQuota(onProgress, stopSignal) {
    const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const YT_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    if (!GEMINI_KEY) throw new Error('Chave Gemini não configurada.');

    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    let totalSaved = 0;
    let cycles = 0;

    while (true) {
      if (stopSignal?.current) {
        onProgress?.({ type: 'stopped', totalSaved, cycles });
        return { reason: 'stopped', totalSaved };
      }

      const quota = await this.getQuotaStatus();
      onProgress?.({ type: 'quota', used: quota.used, remaining: DAILY_QUOTA - quota.used });

      // 1. RSS (always free)
      onProgress?.({ type: 'log', message: 'Verificando canais via RSS...' });
      const rssVideos = await this.scanChannelsViaRSS(YT_KEY);
      onProgress?.({ type: 'log', message: `RSS: ${rssVideos.length} vídeos encontrados em canais confiáveis` });

      // 2. Term search
      const nextTerm = await this.getNextUnusedTerm();
      if (!nextTerm) {
        onProgress?.({ type: 'done', reason: 'all_terms_searched', totalSaved, cycles });
        return { reason: 'all_terms_searched', totalSaved };
      }

      const canUseYouTube = YT_KEY && (quota.used + QUOTA_COSTS.SEARCH + QUOTA_COSTS.VIDEOS_DETAILS) <= (DAILY_QUOTA - SAFETY_MARGIN);
      let searchVideos = [];
      let searchSource = '';

      if (canUseYouTube) {
        onProgress?.({ type: 'log', message: `Buscando no YouTube: "${nextTerm}"` });
        const ytResult = await this.searchYouTube(YT_KEY, nextTerm, 12);
        if (ytResult === 'QUOTA_EXCEEDED') {
          await this.trackQuotaUsage(DAILY_QUOTA);
          onProgress?.({ type: 'quota_hit', message: 'Cota do YouTube atingida — usando Invidious' });
          searchVideos = await this.searchViaInvidious(nextTerm);
          searchSource = 'invidious';
        } else {
          searchVideos = ytResult;
          searchSource = 'youtube';
        }
      } else {
        onProgress?.({ type: 'log', message: `Cota baixa — buscando via Invidious: "${nextTerm}"` });
        searchVideos = await this.searchViaInvidious(nextTerm);
        searchSource = 'invidious';
      }

      if (searchVideos.length > 0) {
        await this.markTermAsSearched(nextTerm);
      }

      // 3. Merge and process
      let allVideos = [...rssVideos, ...searchVideos];
      allVideos = Array.from(new Map(allVideos.map(v => [v.id, v])).values());

      onProgress?.({ type: 'log', message: `Analisando ${allVideos.length} vídeos com Gemini...` });
      const { results, saved } = await this.processAndSaveVideos(allVideos, ai, 8);

      totalSaved += saved;
      cycles++;

      const quotaAfter = await this.getQuotaStatus();
      onProgress?.({
        type: 'cycle_done',
        cycle: cycles,
        term: nextTerm,
        source: searchSource,
        saved,
        totalSaved,
        results,
        quota: { used: quotaAfter.used, remaining: DAILY_QUOTA - quotaAfter.used },
      });

      // Check if we should stop
      const quotaLeft = DAILY_QUOTA - quotaAfter.used;
      if (canUseYouTube && quotaLeft < QUOTA_COSTS.SEARCH + SAFETY_MARGIN) {
        onProgress?.({ type: 'done', reason: 'quota_exhausted', totalSaved, cycles });
        return { reason: 'quota_exhausted', totalSaved };
      }

      // Short delay between cycles
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // ─── FIX LEGACY VIDEOS (duration + reclassify difficulty) ────────────────

  static async fixLegacyVideos() {
    const YT_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    const snap = await getDocs(collection(db, 'community_videos'));

    // Fix duration AND reclassify difficulty for all videos
    const toProcess = snap.docs;
    const results = { fixed: 0, reclassified: 0, errors: 0 };

    // 1. Reclassify difficulty using keyword analysis (free, no API)
    for (const d of toProcess) {
      const data = d.data();
      const newDifficulty = this.classifyDifficulty(data.title, data.channelTitle, data.duration);
      if (newDifficulty !== data.difficulty) {
        try {
          await updateDoc(doc(db, 'community_videos', d.id), { difficulty: newDifficulty });
          results.reclassified++;
        } catch (e) {
          results.errors++;
        }
      }
    }

    // 2. Fix raw ISO 8601 durations (PT1H30M → 1:30:00)
    if (YT_KEY) {
      const toFix = toProcess.filter(d => {
        const dur = d.data().duration;
        return !dur || dur.startsWith('PT') || dur === 'Tutorial';
      });

      for (let i = 0; i < toFix.length; i += 50) {
        const batch = toFix.slice(i, i + 50);
        const ids = batch.map(d => d.data().videoId).join(',');
        try {
          const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${YT_KEY}`;
          const resp = await fetch(url);
          const data = await resp.json();
          await this.trackQuotaUsage(QUOTA_COSTS.VIDEOS_DETAILS);

          for (const item of (data.items || [])) {
            const formatted = this.formatISO8601Duration(item.contentDetails.duration);
            const target = batch.find(d => d.data().videoId === item.id);
            if (target) {
              await updateDoc(doc(db, 'community_videos', target.id), { duration: formatted });
              results.fixed++;
            }
          }
        } catch (e) {
          results.errors += batch.length;
        }
      }
    }

    return results;
  }

  // ─── DATA ACCESS ──────────────────────────────────────────────────────────

  static async getVideoCount() {
    try {
      const snap = await getCountFromServer(collection(db, 'community_videos'));
      return snap.data().count;
    } catch {
      const snap = await getDocs(collection(db, 'community_videos'));
      return snap.docs.length;
    }
  }

  // Seed hash: mesmo usuário + mesmo dia → mesma ordem; dia diferente → embaralha de novo
  static _userDailySeed(userId) {
    const today = new Date().toISOString().split('T')[0];
    const str = (userId || 'guest') + today;
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h);
  }

  static _seededShuffle(array, seed) {
    let s = seed >>> 0;
    const rand = () => {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return (s >>> 0) / 0x100000000;
    };
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static _CACHE_KEY = '@discover_cache';
  static _CACHE_TTL = 60 * 60 * 1000; // 1 hora

  static async _fetchFromFirestore() {
    const snap = await getDocs(query(collection(db, 'community_videos'), limit(300)));
    const videos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    AsyncStorage.setItem(this._CACHE_KEY, JSON.stringify({ videos, fetchedAt: Date.now() })).catch(() => {});
    return videos;
  }

  // Stale-while-revalidate: retorna cache imediatamente se existir, atualiza em background se vencido
  static async getCommunityVideosForUser(userId, forceRefresh = false) {
    const seed = this._userDailySeed(userId);

    if (!forceRefresh) {
      try {
        const raw = await AsyncStorage.getItem(this._CACHE_KEY);
        if (raw) {
          const { videos, fetchedAt } = JSON.parse(raw);
          if (videos?.length > 0) {
            const isStale = Date.now() - fetchedAt > this._CACHE_TTL;
            if (isStale) {
              // Retorna dados velhos agora, atualiza cache em background
              this._fetchFromFirestore().catch(() => {});
            }
            return this._seededShuffle(videos, seed);
          }
        }
      } catch {}
    }

    // Sem cache: primeira abertura — busca e bloqueia até ter dados
    const videos = await this._fetchFromFirestore();
    return this._seededShuffle(videos, seed);
  }

  // ─── DESCOBERTA AO VIVO (nova visão: sem escrita no banco, sem Gemini) ─────
  // Feed = RSS dos canais confiáveis (grátis, fresco) + banco já curado (leitura).
  // Busca = YouTube/Invidious ao vivo com filtro de palavras-chave, resultados
  // efêmeros (nada é salvo no Firestore).

  static _LIVE_CACHE_KEY = '@discover_live_cache';
  static _LIVE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

  // Normaliza vídeo de qualquer fonte (RSS/YouTube/Invidious) para o formato do feed
  static _normalizeLive(v) {
    return {
      id: v.id,
      videoId: v.id,
      title: v.title,
      description: v.description || '',
      channelTitle: v.channelTitle || '',
      channelId: v.channelId || '',
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      thumbnailUrl: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      duration: v.duration || 'Tutorial',
      difficulty: this.classifyDifficulty(v.title, v.channelTitle, v.duration),
      source: v.source || 'youtube',
    };
  }

  // Filtro gratuito: exige menção a origami/dobradura e rejeita categorias conhecidas.
  // Multilíngue: aceita tutoriais em japonês, russo, coreano, chinês etc.
  static _isOrigamiVideo(v) {
    const t = `${v.title || ''} ${v.description || ''} ${v.channelTitle || ''}`.toLowerCase();
    if (this.REJECT_KEYWORDS.some(k => t.includes(k))) return false;
    const positive = [
      // Latino
      'origami', 'paper fold', 'paperfold', 'dobradura', 'paper crane', 'dobrar papel', 'papiroflexia', 'tsuru',
      // Japonês (kanji, hiragana, katakana)
      '折り紙', 'おりがみ', 'オリガミ', '折紙',
      // Chinês (simplificado e tradicional)
      '折纸', '摺紙',
      // Coreano
      '종이접기',
      // Russo / cirílico
      'оригами',
      // Árabe
      'اوريغامي', 'فن طي الورق',
    ];
    return positive.some(k => t.includes(k));
  }

  static async _buildLiveFeed() {
    const YT_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

    const [rssResult, bankResult] = await Promise.allSettled([
      this.scanChannelsViaRSS(YT_KEY),
      this._fetchFromFirestore(), // banco já curado — só leitura, nenhuma escrita nova
    ]);

    const rss  = rssResult.status  === 'fulfilled' ? rssResult.value  : [];
    const bank = bankResult.status === 'fulfilled' ? bankResult.value : [];

    // Canais confiáveis são 100% origami: aplica só o filtro negativo
    const fresh = rss
      .filter(v => !this.REJECT_KEYWORDS.some(k => (v.title || '').toLowerCase().includes(k)))
      .map(v => this._normalizeLive(v));

    // Mescla: RSS (fresco) tem prioridade; banco complementa sem duplicar
    const map = new Map();
    fresh.forEach(v => map.set(v.videoId, v));
    bank.forEach(v => { if (v.videoId && !map.has(v.videoId)) map.set(v.videoId, v); });

    const videos = [...map.values()];
    if (videos.length > 0) {
      AsyncStorage.setItem(this._LIVE_CACHE_KEY, JSON.stringify({ videos, fetchedAt: Date.now() })).catch(() => {});
    }
    return videos;
  }

  // Stale-while-revalidate: cache local 24h, atualiza em background quando vencido
  static async getLiveFeedForUser(userId, forceRefresh = false) {
    const seed = this._userDailySeed(userId);

    if (!forceRefresh) {
      try {
        const raw = await AsyncStorage.getItem(this._LIVE_CACHE_KEY);
        if (raw) {
          const { videos, fetchedAt } = JSON.parse(raw);
          if (videos?.length > 0) {
            if (Date.now() - fetchedAt > this._LIVE_CACHE_TTL) {
              this._buildLiveFeed().catch(() => {});
            }
            return this._seededShuffle(videos, seed);
          }
        }
      } catch {}
    }

    const videos = await this._buildLiveFeed();
    return this._seededShuffle(videos, seed);
  }

  // ─── Freemium: buscas ao vivo por dia (grátis = 3/dia, Pro = ilimitado) ───
  static FREE_LIVE_SEARCHES_PER_DAY = 3;
  static _SEARCH_USES_KEY = '@live_search_uses';

  static async getLiveSearchesUsedToday() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const raw = await AsyncStorage.getItem(this._SEARCH_USES_KEY);
      if (!raw) return 0;
      const { date, count } = JSON.parse(raw);
      return date === today ? (count || 0) : 0;
    } catch {
      return 0;
    }
  }

  static async _trackLiveSearchUse() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const used = await this.getLiveSearchesUsedToday();
      await AsyncStorage.setItem(this._SEARCH_USES_KEY, JSON.stringify({ date: today, count: used + 1 }));
    } catch {}
  }

  // Busca ao vivo no YouTube, forçada ao contexto de origami. Resultados efêmeros.
  // Protegida por cota (fallback Invidious) e cache local por termo (24h).
  // Buscas em cache não consomem o limite diário do plano gratuito.
  static async searchOrigamiLive(userQuery, maxResults = 25, { isPro = false } = {}) {
    const q = (userQuery || '').trim();
    if (!q) return [];

    const cacheKey = `@yt_search_${q.toLowerCase()}`;
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) {
        const { videos, fetchedAt } = JSON.parse(raw);
        if (videos?.length > 0 && Date.now() - fetchedAt < this._LIVE_CACHE_TTL) return videos;
      }
    } catch {}

    // Limite freemium: só conta buscas que realmente vão à rede
    if (!isPro) {
      const used = await this.getLiveSearchesUsedToday();
      if (used >= this.FREE_LIVE_SEARCHES_PER_DAY) {
        const err = new Error('Limite diário de buscas ao vivo atingido');
        err.code = 'SEARCH_LIMIT';
        throw err;
      }
    }
    await this._trackLiveSearchUse();

    const YT_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    // Força o contexto origami na query se o usuário não mencionou
    const searchQuery = /origami|dobradura|papiroflexia/i.test(q) ? q : `origami ${q}`;

    let results = [];
    const quota = await this.getQuotaStatus();
    const canUseYouTube = YT_KEY && (quota.used + QUOTA_COSTS.SEARCH + QUOTA_COSTS.VIDEOS_DETAILS) <= (DAILY_QUOTA - SAFETY_MARGIN);

    if (canUseYouTube) {
      const yt = await this.searchYouTube(YT_KEY, searchQuery, maxResults);
      if (yt === 'QUOTA_EXCEEDED') {
        await this.trackQuotaUsage(DAILY_QUOTA);
        results = await this.searchViaInvidious(searchQuery, maxResults);
      } else {
        results = yt;
      }
    } else {
      results = await this.searchViaInvidious(searchQuery, maxResults);
    }

    const filtered = (Array.isArray(results) ? results : [])
      .filter(v => this._isOrigamiVideo(v))
      .map(v => this._normalizeLive(v));

    if (filtered.length > 0) {
      AsyncStorage.setItem(cacheKey, JSON.stringify({ videos: filtered, fetchedAt: Date.now() })).catch(() => {});
    }
    return filtered;
  }

  // Mantido para compatibilidade com AdminDiscovery
  static async getCommunityVideos(limitCount = 20, lastDoc = null) {
    let q = query(collection(db, 'community_videos'), orderBy('addedAt', 'desc'), limit(limitCount));
    if (lastDoc) {
      q = query(collection(db, 'community_videos'), orderBy('addedAt', 'desc'), startAfter(lastDoc), limit(limitCount));
    }
    const snap = await getDocs(q);
    return {
      videos: snap.docs.map(d => ({ id: d.id, ...d.data() })),
      lastVisible: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    };
  }

  static async getAllVideos() {
    const q = query(collection(db, 'community_videos'), orderBy('addedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async getRandomVideoByDifficulty(rank) {
    const diffMap = {
      'Iniciante':     ['easy'],
      'Intermediário': ['easy', 'intermediate'],
      'Avançado':      ['easy', 'intermediate', 'hard'],
    };
    const levels = diffMap[rank] || ['easy'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    try {
      const q = query(collection(db, 'community_videos'), where('difficulty', '==', level), limit(50));
      const snap = await getDocs(q);
      const docs = snap.empty ? null : snap.docs;
      if (!docs) {
        const fallback = await getDocs(query(collection(db, 'community_videos'), limit(20)));
        if (fallback.empty) return null;
        const r = fallback.docs[Math.floor(Math.random() * fallback.docs.length)];
        return { id: r.id, ...r.data() };
      }
      const r = docs[Math.floor(Math.random() * docs.length)];
      return { id: r.id, ...r.data() };
    } catch {
      return null;
    }
  }

  // ─── UTILS ────────────────────────────────────────────────────────────────

  static formatISO8601Duration(duration) {
    if (!duration || duration === 'PT0M0S' || duration === 'PTMOS') return 'Tutorial';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'Tutorial';
    const h = parseInt(match[1] || 0);
    const m = parseInt(match[2] || 0);
    const s = parseInt(match[3] || 0);
    let result = '';
    if (h > 0) result += h + ':' + (m < 10 ? '0' : '');
    result += m + ':' + (s < 10 ? '0' : '') + s;
    return result;
  }
}
