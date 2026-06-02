import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { VideoDiscoveryUseCase } from '../domain/usecases/VideoDiscoveryUseCase';
import { Search, CheckCircle, XCircle, ChevronLeft, Database, RefreshCw, Zap, Square, Wifi, WifiOff } from 'lucide-react-native';

const DAILY_QUOTA = 10000;

export default function AdminDiscovery({ onBack }) {
  const { theme } = useApp();
  const [loading, setLoading] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [videoCount, setVideoCount] = useState(0);
  const [termsRemaining, setTermsRemaining] = useState(0);
  const [quota, setQuota] = useState({ used: 0, remaining: DAILY_QUOTA });
  const [results, setResults] = useState([]);
  const [log, setLog] = useState([]);
  const stopRef = useRef(false);
  const scrollRef = useRef(null);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const [count, terms, quotaStatus] = await Promise.all([
      VideoDiscoveryUseCase.getVideoCount(),
      VideoDiscoveryUseCase.getRemainingTermsCount(),
      VideoDiscoveryUseCase.getQuotaStatus(),
    ]);
    setVideoCount(count);
    setTermsRemaining(terms);
    setQuota({ used: quotaStatus.used, remaining: DAILY_QUOTA - quotaStatus.used });
  };

  const addLog = (msg, type = 'info') => {
    setLog(prev => [...prev.slice(-30), { msg, type, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Single manual scan
  const handleScan = async () => {
    setLoading(true);
    setResults([]);
    setLog([]);
    addLog('Iniciando scan único (RSS + 1 termo)...');
    try {
      const scanResults = await VideoDiscoveryUseCase.scanAndSaveVideos();
      setResults(scanResults);
      const saved = scanResults.filter(r => r.status === 'saved').length;
      addLog(`Concluído: ${saved} vídeos salvos`, saved > 0 ? 'success' : 'info');
      await loadStats();
    } catch (err) {
      if (err.message === 'QUOTA_EXCEEDED') {
        addLog('Cota diária do YouTube atingida.', 'error');
      } else {
        addLog('Erro: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto scan loop
  const handleAutoScan = async () => {
    if (autoRunning) {
      stopRef.current = true;
      return;
    }
    stopRef.current = false;
    setAutoRunning(true);
    setResults([]);
    setLog([]);
    addLog('Auto-scan iniciado — rodará até a cota acabar ou todos os termos serem pesquisados.');

    try {
      await VideoDiscoveryUseCase.autoScanUntilQuota((event) => {
        switch (event.type) {
          case 'quota':
            setQuota({ used: event.used, remaining: event.remaining });
            break;
          case 'log':
            addLog(event.message);
            break;
          case 'quota_hit':
            addLog(event.message, 'warn');
            break;
          case 'cycle_done':
            setQuota({ used: event.quota.used, remaining: event.quota.remaining });
            setResults(prev => [...event.results, ...prev]);
            addLog(`Ciclo ${event.cycle}: "${event.term}" (${event.source}) → ${event.saved} salvos | Total: ${event.totalSaved}`, 'success');
            loadStats();
            break;
          case 'done':
            const reasons = {
              quota_exhausted: 'Cota do YouTube atingida para hoje.',
              all_terms_searched: 'Todos os termos da lista já foram pesquisados.',
              stopped: 'Auto-scan interrompido manualmente.',
            };
            addLog(reasons[event.reason] || 'Finalizado.', 'success');
            addLog(`Total: ${event.totalSaved} vídeos salvos em ${event.cycles} ciclos.`);
            break;
          case 'stopped':
            addLog('Auto-scan parado pelo usuário.', 'warn');
            break;
        }
      }, stopRef);
    } catch (err) {
      addLog('Erro no auto-scan: ' + err.message, 'error');
    } finally {
      setAutoRunning(false);
      stopRef.current = false;
      await loadStats();
    }
  };

  // Fix legacy videos (duration + reclassify difficulty)
  const handleFixVideos = async () => {
    setLoading(true);
    setLog([]);
    addLog('Corrigindo durações e reclassificando dificuldades...');
    try {
      const res = await VideoDiscoveryUseCase.fixLegacyVideos();
      addLog(`Duração corrigida em ${res.fixed} vídeos.`, 'success');
      addLog(`Dificuldade reclassificada em ${res.reclassified} vídeos.`, 'success');
      if (res.errors > 0) addLog(`${res.errors} erros.`, 'warn');
      await loadStats();
    } catch (err) {
      addLog('Erro: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const quotaPct = Math.min((quota.used / DAILY_QUOTA) * 100, 100);
  const quotaColor = quotaPct > 80 ? '#ef4444' : quotaPct > 50 ? '#f59e0b' : '#22c55e';

  const logColor = { info: theme.textDim, success: '#22c55e', error: '#ef4444', warn: '#f59e0b' };

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text }]}>Origami AI Discovery</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats card */}
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Database color={theme.primary} size={20} />
              <Text style={[s.statNum, { color: theme.text }]}>{videoCount}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Vídeos</Text>
            </View>
            <View style={s.statItem}>
              <Search color={theme.primary} size={20} />
              <Text style={[s.statNum, { color: theme.text }]}>{termsRemaining}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Termos restantes</Text>
            </View>
            <View style={s.statItem}>
              <Wifi color={theme.primary} size={20} />
              <Text style={[s.statNum, { color: theme.text }]}>{VideoDiscoveryUseCase.TRUSTED_CHANNELS.length}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Canais RSS</Text>
            </View>
          </View>
        </View>

        {/* Quota tracker — self-tracked (YouTube has no quota API) */}
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={s.quotaHeader}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Cota do YouTube</Text>
            <Text style={[s.quotaNumbers, { color: quotaColor }]}>{quota.used.toLocaleString()} / {DAILY_QUOTA.toLocaleString()}</Text>
          </View>
          <View style={[s.quotaTrack, { backgroundColor: theme.border }]}>
            <View style={[s.quotaFill, { width: `${quotaPct}%`, backgroundColor: quotaColor }]} />
          </View>
          <Text style={[s.quotaNote, { color: theme.textDim }]}>
            Rastreado localmente — YouTube não oferece API de quota. Reseta todo dia à meia-noite UTC.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={s.btnGroup}>
          {/* Auto scan */}
          <TouchableOpacity
            onPress={handleAutoScan}
            disabled={loading}
            style={[s.primaryBtn, { backgroundColor: autoRunning ? '#ef4444' : theme.primary, opacity: loading ? 0.5 : 1 }]}
          >
            {autoRunning ? (
              <>
                <Square color="#fff" size={18} />
                <Text style={s.primaryBtnText}>Parar Auto-Scan</Text>
              </>
            ) : (
              <>
                <Zap color="#fff" size={18} />
                <Text style={s.primaryBtnText}>Auto-Scan até Cota</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Single scan */}
          <TouchableOpacity
            onPress={handleScan}
            disabled={loading || autoRunning}
            style={[s.secondaryBtn, { borderColor: theme.border, opacity: (loading || autoRunning) ? 0.5 : 1 }]}
          >
            {loading && !autoRunning ? (
              <ActivityIndicator color={theme.primary} size={18} />
            ) : (
              <Search color={theme.primary} size={18} />
            )}
            <Text style={[s.secondaryBtnText, { color: theme.text }]}>Scan Único (1 ciclo)</Text>
          </TouchableOpacity>

          {/* Fix videos */}
          <TouchableOpacity
            onPress={handleFixVideos}
            disabled={loading || autoRunning}
            style={[s.secondaryBtn, { borderColor: theme.border, opacity: (loading || autoRunning) ? 0.5 : 1 }]}
          >
            <RefreshCw color={theme.textDim} size={18} />
            <Text style={[s.secondaryBtnText, { color: theme.textDim }]}>Corrigir Duração + Dificuldade</Text>
          </TouchableOpacity>
        </View>

        {/* Live log */}
        {log.length > 0 && (
          <View style={[s.logCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[s.logTitle, { color: theme.text }]}>Log</Text>
            <ScrollView ref={scrollRef} style={s.logScroll} nestedScrollEnabled>
              {log.map((entry, i) => (
                <View key={i} style={s.logRow}>
                  <Text style={[s.logTime, { color: theme.textDim }]}>{entry.time}</Text>
                  <Text style={[s.logMsg, { color: logColor[entry.type] || theme.textDim }]}>{entry.msg}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Resultados ({results.length})</Text>
            {results.slice(0, 40).map((res, i) => (
              <View key={i} style={[s.resultRow, { borderTopColor: theme.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
                {res.status === 'saved'    ? <CheckCircle color="#22c55e" size={14} />
                : res.status === 'rejected' ? <XCircle color="#ef4444" size={14} />
                : <View style={[s.dot, { backgroundColor: theme.border }]} />}
                <Text style={[s.resultText, { color: theme.text }]} numberOfLines={1}>
                  [{res.status}{res.difficulty ? ` · ${res.difficulty}` : ''}] {res.title}
                </Text>
              </View>
            ))}
            {results.length > 40 && (
              <Text style={[s.moreText, { color: theme.textDim }]}>+ {results.length - 40} mais</Text>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 15 },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  title: { fontSize: 20, fontWeight: '700' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },

  quotaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  quotaNumbers: { fontSize: 13, fontWeight: '700' },
  quotaTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  quotaFill: { height: '100%', borderRadius: 4 },
  quotaNote: { fontSize: 11, lineHeight: 16 },

  btnGroup: { gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 13, borderRadius: 16, borderWidth: 1 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },

  logCard: { borderRadius: 16, borderWidth: 1, padding: 12 },
  logTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  logScroll: { maxHeight: 200 },
  logRow: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  logTime: { fontSize: 10, fontFamily: 'monospace', width: 28 },
  logMsg: { fontSize: 12, flex: 1, lineHeight: 16 },

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  resultText: { flex: 1, fontSize: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  moreText: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
