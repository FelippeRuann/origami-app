import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../../firebase";
import { collection, addDoc, query, where, getDocs, limit, orderBy, startAfter, updateDoc, doc } from "firebase/firestore";

/**
 * Hook/UseCase para descobrir e filtrar vídeos de origami automaticamente.
 */
export class VideoDiscoveryUseCase {
  
  // Canais recomendados pelo usuário e canais de alta complexidade
  static TRUSTED_CHANNELS = [
    { name: 'OrigamiByBoice', channelId: 'UC6M87S6vGv80_eZfK0OjkxQ' },
    { name: 'Tadashi Mori', channelId: 'UCkS-U7Iovn660_9VAtO8wVQ' },
    { name: 'Jo Nakashima', channelId: 'UC3ICC_79U9UonN9p96p9WpW' },
    { name: 'Mariano Zavala Origami', channelId: 'UCU7v-O6_pUfbeR9X_zQoNug' }, // Ultra Complex
    { name: 'SakuSaku Origami', channelId: 'UCGjPia7f9rQOQ750hpxH-MA' },
    { name: 'Kade Chan', channelId: 'UCFscP-YIdN-v7_D1Pq8YfCg' }, // Master Design
    { name: 'Origami Oritai', channelId: 'UCyL_L6qS_yq3zY7y9U3U9-Q' }
  ];

  static async scanAndSaveVideos() {
    const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const YT_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    
    if (!GEMINI_KEY) throw new Error("Chave Gemini não configurada.");
    if (!YT_KEY) throw new Error("Chave do YouTube não configurada.");

    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    
    let videos = [];
    let quotaHit = false;
    
    // 1. Busca em canais de alta complexidade (Randomiza para ECONOMIZAR COTA)
    const randomChannel = this.TRUSTED_CHANNELS[Math.floor(Math.random() * this.TRUSTED_CHANNELS.length)];
    try {
        const channelVids = await this.searchYouTube(YT_KEY, "origami complex tutorial", 12, randomChannel.channelId);
        if (channelVids === 'QUOTA_EXCEEDED') {
          quotaHit = true;
        } else {
          videos = [...videos, ...channelVids];
        }
    } catch (e) {
        console.warn("Erro ao buscar canal:", randomChannel.name);
    }

    if (!quotaHit) {
      const masterTerms = [
        "Satoshi Kamiya origami tutorial", "Robert Lang origami instructions", "Hojyo Takashi origami", 
        "Kade Chan origami master", "Jason Ku origami tutorial", "Ancient Dragon origami tutorial", 
        "Ryu Jin origami 3.5 instructions", "Origami Nazgul super complex", "Origami Phoenix 3.5 Satoshi Kamiya", 
        "Godzilla origami complex tutorial", "Origami Samurai Helmet advanced", "Origami Grim Reaper complex",
        "Origami Hydra 2.0 tutorial", "Origami Pokemon advanced instructions", "Charizard origami tutorial Jo Nakashima",
        "Origami Bahamut tutorial", "Eric Joisel origami study", "Satoshi Kamiya Pegasus instructions",
        "Origami Inoshikacho complex", "Origami White Whale Satoshi Kamiya", "Origami Unicorn Satoshi Kamiya",
        "Origami Western Dragon tutorial", "Shuki Kato origami tutorial", "Origami Giganotosaurus complex",
        "Origami Lion Satoshi Kamiya", "Origami Wizard Hojyo Takashi", "Origami Angel Hojyo Takashi"
      ];
      
      const randomTerm = masterTerms[Math.floor(Math.random() * masterTerms.length)];

      try {
        const vids = await this.searchYouTube(YT_KEY, randomTerm, 12);
        if (vids === 'QUOTA_EXCEEDED') {
          quotaHit = true;
        } else {
          videos = [...videos, ...vids];
        }
      } catch (e) {
        console.warn("Erro ao buscar termo:", randomTerm);
      }
    }
    
    videos = Array.from(new Map(videos.map(v => [v.id, v])).values());

    const results = [];
    let savedThisTurn = 0;
    const MAX_SAVES_PER_TURN = 5; 

    for (const vid of videos) {
      if (savedThisTurn >= MAX_SAVES_PER_TURN) {
        results.push({ id: vid.id, title: vid.title, status: 'limit_reached' });
        continue;
      }

      const lowTitle = vid.title.toLowerCase();
      const lowDesc = vid.description.toLowerCase();
      
      const keywords = ["origami", "paper", "tutorial", "step", "fold", "instruction", "how to"];
      const hasKeywords = keywords.some(k => lowTitle.includes(k) || lowDesc.includes(k));
      
      if (!hasKeywords) {
        results.push({ id: vid.id, title: vid.title, status: 'filtered' });
        continue;
      }

      const exists = await this.checkIfExists(vid.id);
      if (exists) {
        results.push({ id: vid.id, title: vid.title, status: 'skipped' });
        continue;
      }

      const analysis = await this.analyzeWithAI(ai, vid);
      
      if (analysis && analysis.isOrigami) {
        // Formata a duração antes de salvar
        const formattedDuration = this.formatISO8601Duration(vid.duration);

        await addDoc(collection(db, "community_videos"), {
          videoId: vid.id || "",
          title: vid.title || "Sem título",
          description: vid.description || "",
          channelTitle: vid.channelTitle || "Canal desconhecido",
          channelId: vid.channelId || "",
          thumbnail: vid.thumbnail || "",
          duration: formattedDuration, // Salva formatado!
          tags: analysis.tags || [],
          difficulty: analysis.difficulty || 'unknown',
          addedAt: new Date(),
          verifiedByAI: true,
          aiSummary: analysis.summary || ""
        });
        results.push({ id: vid.id, title: vid.title, status: 'saved' });
        savedThisTurn++;
      } else {
        results.push({ id: vid.id, title: vid.title, status: 'rejected' });
      }
    }

    if (quotaHit && results.length === 0) {
      throw new Error("QUOTA_EXCEEDED");
    }

    return results;
  }

  static formatISO8601Duration(duration) {
    if (!duration || duration === "PT0M0S" || duration === "PTMOS") return "Tutorial";
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "Tutorial";

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    let result = "";
    if (hours > 0) {
      result += hours + ":" + (minutes < 10 ? "0" : "");
    }
    
    result += minutes + ":" + (seconds < 10 ? "0" : "");
    result += seconds;

    return result;
  }

  static async searchYouTube(apiKey, query, maxResults, channelId = null) {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
    if (channelId) {
      url += `&channelId=${channelId}`;
    }
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.error) {
        if (data.error.message.includes('quota') || data.error.errors?.[0]?.reason === 'quotaExceeded') {
          return 'QUOTA_EXCEEDED';
        }
        throw new Error(data.error.message);
      }

      const videoIds = data.items.map(item => item.id.videoId).join(',');
      
      // Busca detalhes dos vídeos (especialmente a duração)
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`;
      const detailsResp = await fetch(detailsUrl);
      const detailsData = await detailsResp.json();
      
      const durationsMap = {};
      if (detailsData.items) {
        detailsData.items.forEach(v => {
          durationsMap[v.id] = v.contentDetails.duration;
        });
      }

      return data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        duration: durationsMap[item.id.videoId] || "PT0M0S"
      }));
    } catch (err) {
      console.error("Erro na busca do YouTube:", err);
      return [];
    }
  }

  static async analyzeWithAI(ai, video) {
    let base64Data = null;
    try {
      const imageResp = await fetch(video.thumbnail);
      const blob = await imageResp.blob();
      base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Miniatura indisponível para IA.");
    }

    try {
      const textPart = {
        text: `Analise este vídeo:
        Título: "${video.title}"
        Descrição: "${video.description}"
        Canal: "${video.channelTitle}"
        
        Você é um especialista em Origami. Determine se é um tutorial REAL de dobradura de papel.
        - Rejeite: Stop-motion sem ensino, desenhos 3D, músicas com nome origami.
        - Aceite: Tutoriais passo-a-passo reais.
        
        Retorne APENAS um JSON:
        {
          "isOrigami": boolean,
          "tags": string[],
          "difficulty": "easy" | "intermediate" | "hard",
          "summary": string
        }
        
        Guia de Dificuldade:
        - Tutoriais simples/curtos: "easy"
        - Tutoriais complexos ou de ~30 min: "intermediate"
        - Tutoriais muito longos (+1 hora) ou complexos: "hard"`
      };

      const parts = [textPart];

      if (base64Data) {
        parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isOrigami: { type: Type.BOOLEAN },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                difficulty: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["isOrigami"]
            }
        }
      });
      
      const text = response.text;
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("Gemini Error:", err);
      return { isOrigami: false };
    }
  }

  static async checkIfExists(videoId) {
    const q = query(collection(db, "community_videos"), where("videoId", "==", videoId));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  static async getCommunityVideos(limitCount = 20, lastDoc = null) {
    let q = query(collection(db, "community_videos"), orderBy("addedAt", "desc"), limit(limitCount));
    
    if (lastDoc) {
      q = query(collection(db, "community_videos"), orderBy("addedAt", "desc"), startAfter(lastDoc), limit(limitCount));
    }
    
    const snap = await getDocs(q);
    const docs = snap.docs;
    
    return {
      videos: docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastVisible: docs.length > 0 ? docs[docs.length - 1] : null
    };
  }

  /**
   * Corrige vídeos antigos que estão com 'PTMOS' ou formato raw do YouTube
   */
  static async fixLegacyVideos() {
    const YT_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    if (!YT_KEY) throw new Error("Chave do YouTube não configurada.");

    const q = query(collection(db, "community_videos"));
    const snap = await getDocs(q);
    
    // Filtra documentos que precisam de correção
    const toFix = snap.docs.filter(d => {
      const data = d.data();
      return !data.duration || data.duration.startsWith('PT') || data.duration === 'Tutorial';
    });

    if (toFix.length === 0) return { fixed: 0, total: 0 };

    const results = { fixed: 0, errors: 0 };

    // Processa em lotes de 50 (limite do YouTube API v3 para 'id')
    for (let i = 0; i < toFix.length; i += 50) {
      const batch = toFix.slice(i, i + 50);
      const ids = batch.map(d => d.data().videoId).join(',');

      try {
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${YT_KEY}`;
        const resp = await fetch(detailsUrl);
        const data = await resp.json();

        if (data.items) {
          for (const item of data.items) {
            const rawDuration = item.contentDetails.duration;
            const formatted = this.formatISO8601Duration(rawDuration);
            
            // Encontra o documento local correspondente ao videoId do YouTube
            const targetDoc = batch.find(d => d.data().videoId === item.id);
            if (targetDoc) {
              await updateDoc(doc(db, "community_videos", targetDoc.id), {
                duration: formatted
              });
              results.fixed++;
            }
          }
        }
      } catch (err) {
        console.error("Erro ao corrigir lote:", err);
        results.errors += batch.length;
      }
    }

    return results;
  }
}
