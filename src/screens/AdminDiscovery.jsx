import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { VideoDiscoveryUseCase } from '../domain/usecases/VideoDiscoveryUseCase';
import { Search, CheckCircle, XCircle, ChevronLeft, Database, RefreshCw } from 'lucide-react-native';

export default function AdminDiscovery({ onBack }) {
  const { theme } = useApp();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [existingCount, setExistingCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const videos = await VideoDiscoveryUseCase.getCommunityVideos(50);
    setExistingCount(videos.length);
  };

  const handleScan = async () => {
    setLoading(true);
    setResults([]);
    try {
      const scanResults = await VideoDiscoveryUseCase.scanAndSaveVideos();
      setResults(scanResults);
      await loadStats();
    } catch (err) {
      if (err.message === 'QUOTA_EXCEEDED') {
        alert("Ops! A cota diária de busca do YouTube acabou. Tente novamente amanhã ou use sua própria chave nas configurações.");
      } else {
        alert("Erro no scan: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFixVideos = async () => {
    setLoading(true);
    try {
      const res = await VideoDiscoveryUseCase.fixLegacyVideos();
      alert(`Reparo concluído! ${res.fixed} vídeos corrigidos.`);
      await loadStats();
    } catch (err) {
      alert("Erro ao corrigir: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Origami AI Discovery</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Database color={theme.primary} size={32} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Status do Banco</Text>
          <Text style={[styles.cardStats, { color: theme.textMuted }]}>
            {existingCount} vídeos verificados pela IA no Firestore.
          </Text>
          
          <TouchableOpacity 
            onPress={handleScan} 
            disabled={loading}
            style={[styles.scanBtn, { backgroundColor: loading ? theme.border : theme.primary }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Search color="#fff" size={20} />
                <Text style={styles.scanBtnText}>Iniciar Scan com Gemini AI</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleFixVideos} 
            disabled={loading}
            style={[styles.fixBtn, { borderColor: theme.border, borderWidth: 1 }]}
          >
            <RefreshCw color={theme.text} size={18} />
            <Text style={[styles.fixBtnText, { color: theme.text }]}>Consertar Vídeos Antigos (Duração)</Text>
          </TouchableOpacity>
          
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            O Gemini filtrará vídeos do YouTube analisando visualmente a miniatura e o contexto. 
            Apenas tutoriais reais serão salvos.
          </Text>
        </View>

        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultsTitle, { color: theme.text }]}>Resultados do Último Scan:</Text>
            {results.map((res, i) => (
              <View key={i} style={[styles.resultSlot, { borderBottomColor: theme.border }]}>
                {res.status === 'saved' ? (
                  <CheckCircle color="#22c55e" size={16} />
                ) : res.status === 'rejected' ? (
                  <XCircle color="#ef4444" size={16} />
                ) : (
                  <CheckCircle color="#94a3b8" size={16} />
                )}
                <Text style={[styles.resultText, { color: theme.text }]} numberOfLines={1}>
                   [{res.status}] {res.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  title: { fontSize: 20, fontWeight: '700' },
  scroll: { padding: 20 },
  card: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 30
  },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardStats: { fontSize: 14, textAlign: 'center' },
  scanBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    marginTop: 10,
    width: '100%',
    justifyContent: 'center'
  },
  scanBtnText: { color: '#fff', fontWeight: 'bold' },
  fixBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fixBtnText: { fontSize: 13, fontWeight: '600' },
  disclaimer: { fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 },
  resultsContainer: { gap: 10 },
  resultsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  resultSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12
  },
  resultText: { 
    fontSize: 14, 
    flex: 1, 
    color: '#FFFFFF', 
    fontWeight: '500',
    opacity: 1 // Garantindo que não haja transparência
  }
});
