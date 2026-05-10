export class YouTubeService {
  /**
   * Busca as informações reais de um vídeo do YouTube.
   * Tenta usar a API Oficial (se houver chave). Se não houver, usa o endpoint OEmbed (público)
   * que retorna o título real e a capa do vídeo direto dos servidores do YouTube.
   */
  static async getVideoDetails(videoId) {
    try {
      const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

      if (apiKey) {
        // Usa a API oficial do YouTube (precisa de chave)
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          return {
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
            views: this.formatViews(item.statistics.viewCount),
            channel: item.snippet.channelTitle,
          };
        }
      }

      // FALLBACK: OEmbed API (Não precisa de chave, puxa direto do YouTube!)
      // Isso resolve o seu problema de querer puxar a info REAL sem depender de mock.
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        return {
          title: oembedData.title,
          thumbnail: oembedData.thumbnail_url,
          views: "Real views (Requer API Key)",
          channel: oembedData.author_name,
        };
      }

      throw new Error("Vídeo indisponível ou listado como privado.");
    } catch (error) {
      console.error("Erro no YouTubeService:", error);
      return null;
    }
  }

  static formatViews(viewCount) {
    if (!viewCount) return "0 views";
    const num = parseInt(viewCount, 10);
    if (num > 1000000) return (num / 1000000).toFixed(1) + "M views";
    if (num > 1000) return (num / 1000).toFixed(1) + "K views";
    return num + " views";
  }
}
