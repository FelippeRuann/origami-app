import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated, Image, ActivityIndicator, Alert, Switch, TextInput, Linking, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import { SUPPORT_EMAIL, isAdminEmail } from '../config/admin';

const { width } = Dimensions.get('window');

export default function Profile() {
  const { user, theme, logout, updateAvatar, removeAvatar, updateName, checkUsername, saveUsername, isDarkMode, toggleTheme, upgradeToPro, downgradeFromPro, importedProjects, setCurrentRoute, ACHIEVEMENT_DEFS, updateRank, notifPrefs, updateNotifPrefs, hapticsEnabled, updateHapticsEnabled, soundsEnabled, updateSoundsEnabled, pendingProOpen, setPendingProOpen, scrollToTopSignal } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [userDraft, setUserDraft] = useState('');
  const [userStatus, setUserStatus] = useState(null); // { available, reason }
  const [savingUser, setSavingUser] = useState(false);
  const [showRankSelector, setShowRankSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProPage, setShowProPage] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef(null);

  // Tocar na aba Profile já ativa: rola de volta ao topo
  useEffect(() => {
    if (scrollToTopSignal?.route === 'Profile' && scrollToTopSignal.tick > 0) {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [scrollToTopSignal]);

  useEffect(() => {
    if (pendingProOpen) {
      setShowSettings(true);
      setShowProPage(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      setPendingProOpen(false);
    }
  }, [pendingProOpen]);

  const handleOpenSettings = () => {
    setShowSettings(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const handleCloseSettings = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true })
    ]).start(() => {
      setShowSettings(false);
      setShowEditProfile(false);
      setShowRankSelector(false);
      setShowNotifications(false);
      setShowProPage(false);
    });
  };

  const handlePickImage = async () => {
    // Pedir permissão para acessar a galeria
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("Precisamos da sua permissão para acessar a galeria!");
      return;
    }

    // Abrir a galeria
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setUploadingAvatar(true);
      // Envia o arquivo direto conforme solicitado (assets[0].file no Web)
      const imageFile = result.assets[0].file || result.assets[0].uri;
      const response = await updateAvatar(imageFile);
      setUploadingAvatar(false);

      if (!response.success) {
        alert("Erro ao atualizar foto: " + response.error);
      }
    }
  };

  const handleSaveNotifPrefs = async (newPrefs) => {
    // expo-notifications não funciona no web — salva preferências sem agendar
    if (Platform.OS === 'web') {
      await updateNotifPrefs(newPrefs);
      return;
    }

    try {
      if (newPrefs.dailyReminder || newPrefs.streakAlert) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permissão negada',
            'Ative as notificações nas configurações do dispositivo para receber lembretes.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      }

      await Notifications.cancelAllScheduledNotificationsAsync();

      if (newPrefs.dailyReminder) {
        const [h, m] = (newPrefs.reminderTime || '20:00').split(':').map(Number);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Hora de dobrar! 🦢',
            body: 'Seu lembrete diário de origami está esperando.',
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'origami-reminders' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: h,
            minute: m,
          },
        });
      }

      if (newPrefs.streakAlert) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Não quebre seu streak! 🔥',
            body: 'Pratique origami hoje para manter sua sequência.',
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'origami-reminders' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 20,
            minute: 0,
          },
        });
      }

      await updateNotifPrefs(newPrefs);
    } catch (e) {
      console.warn('Erro ao configurar notificações:', e);
      Alert.alert('Erro', 'Não foi possível configurar as notificações. Tente novamente.');
    }
  };

  // Consulta com debounce: sem isso cada tecla vira uma chamada de function.
  useEffect(() => {
    const alvo = userDraft.trim().toLowerCase();
    if (!alvo || alvo === (user?.username || '')) { setUserStatus(null); return; }

    let cancelado = false;
    const timer = setTimeout(async () => {
      const res = await checkUsername(alvo);
      if (!cancelado) setUserStatus(res);
    }, 500);

    return () => { cancelado = true; clearTimeout(timer); };
  }, [userDraft, user?.username]);

  const handleSaveUsername = async () => {
    setSavingUser(true);
    const res = await saveUsername(userDraft);
    setSavingUser(false);
    if (res.success) {
      setUserStatus({ available: true, reason: null });
      Alert.alert('Pronto', `Seu nome de usuário agora é @${res.username}`);
    } else {
      Alert.alert('Não foi possível salvar', res.error);
    }
  };

  const handleSaveName = async () => {
    setSavingName(true);
    const res = await updateName(nameDraft);
    setSavingName(false);
    if (res.success) {
      setShowEditProfile(false);
    } else {
      Alert.alert('Não foi possível alterar', res.error);
    }
  };

  const handleSupportEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Ajuda%20-%20OrigamiApp`);
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: theme.bg }]}>
        <Text style={[s.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>App</Text>
        <View style={s.topBarActions}>
          {isAdminEmail(user?.email) && (
            <TouchableOpacity 
              style={[s.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.border, marginRight: 10 }]} 
              onPress={() => setCurrentRoute('AdminDiscovery')}
            >
              <Feather name="database" size={20} color={theme.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.border, marginRight: 10 }]} onPress={toggleTheme}>
            <Feather name={isDarkMode ? 'sun' : 'moon'} size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleOpenSettings}>
            <Feather name="settings" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={mainScrollRef} style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={s.header}>
          <TouchableOpacity 
            style={[s.avatarWrap, { borderColor: theme.primary, backgroundColor: theme.secondary }]}
            onPress={handlePickImage}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator color={theme.primary} size="large" />
            ) : user?.photo?.startsWith('http') ? (
              <Image source={{ uri: user.photo }} style={s.avatarImage} />
            ) : (
              <Feather name={user?.photo || 'user'} size={40} color={theme.primary} />
            )}
            
            <View style={[s.editBadge, { backgroundColor: theme.primary, borderColor: theme.bg }]}>
              <Feather name="camera" size={12} color={theme.bg} />
            </View>

            {user?.isPro && (
              <View style={[s.proBadge, { backgroundColor: theme.primary }]}>
                <Text style={[s.proText, { color: theme.bg }]}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[s.name, { color: theme.text }]}>{user?.name || 'Origami Master'}</Text>
          <Text style={[s.email, { color: theme.textMuted }]}>{user?.email || 'master@origamiapp.com'}</Text>
          
          <View style={s.statsContainer}>
            <View style={[s.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statNum, { color: theme.primary }]}>{user?.watchedVideos || 0}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Assistidos</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statNum, { color: theme.primary }]}>{user?.achievements?.length || 0}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Conquistas</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statNum, { color: theme.primary }]}>{user?.streak || 0}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Streak 🔥</Text>
            </View>
          </View>

          {/* Streak context */}
          {(user?.streak || 0) > 0 && (
            <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
              Último acesso: {user?.lastStreakDate ? new Date(user.lastStreakDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }) : '—'}
            </Text>
          )}
        </View>

        {/* Conquistas */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Conquistas</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>
            {user?.achievements?.length || 0} de {(ACHIEVEMENT_DEFS || []).length} desbloqueadas
          </Text>
          <View style={s.achieveList}>
            {(ACHIEVEMENT_DEFS || []).map(def => {
              const unlocked = user?.achievements?.includes(def.id) ?? false;
              return (
                <View key={def.id} style={[s.achieveCard, { backgroundColor: theme.surface, borderColor: unlocked ? theme.primary + '60' : theme.border, opacity: unlocked ? 1 : 0.45 }]}>
                  <View style={[s.achieveIcon, { backgroundColor: unlocked ? theme.primaryLight : theme.bg }]}>
                    <Feather name={unlocked ? def.icon : 'lock'} size={24} color={unlocked ? theme.primary : theme.textMuted} />
                  </View>
                  <View style={s.achieveInfo}>
                    <Text style={[s.achieveTitle, { color: theme.text }]}>{def.title}</Text>
                    <Text style={[s.achieveDesc, { color: theme.textMuted }]}>{def.desc}</Text>
                  </View>
                  {unlocked && (
                    <Feather name="check-circle" size={18} color={theme.primary} style={{ marginLeft: 8 }} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent={true} animationType="none" onRequestClose={handleCloseSettings}>
        <Animated.View style={[s.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseSettings} />
          <Animated.View style={[s.modalContent, { backgroundColor: theme.bg, borderColor: theme.border, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>
                {showRankSelector ? 'Nível de Dobragem' : showEditProfile ? 'Editar Perfil' : showNotifications ? 'Notificações' : showProPage ? 'Plano Pro' : 'Configurações'}
              </Text>
              <TouchableOpacity onPress={handleCloseSettings} style={s.closeBtn}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {showRankSelector ? (
              <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {['Iniciante', 'Intermediário', 'Avançado'].map((rank, i) => {
                  const rankColors = { 'Iniciante': '#22C55E', 'Intermediário': '#3B82F6', 'Avançado': '#F59E0B' };
                  const color = rankColors[rank];
                  const isSelected = user?.rank === rank;
                  return (
                    <TouchableOpacity
                      key={rank}
                      style={[s.linkRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }, isSelected && { backgroundColor: color + '18' }]}
                      onPress={async () => { await updateRank(rank); setShowRankSelector(false); }}
                    >
                      <View>
                        <Text style={[s.linkText, { color: isSelected ? color : theme.text }]}>{rank}</Text>
                        {isSelected && <Text style={{ fontSize: 11, color, marginTop: 2 }}>Nível atual</Text>}
                      </View>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color, backgroundColor: isSelected ? color : 'transparent' }} />
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowRankSelector(false)}>
                  <Text style={[s.linkText, { color: theme.textDim }]}>Voltar</Text>
                  <Feather name="arrow-left" size={20} color={theme.textDim} />
                </TouchableOpacity>
              </View>

            ) : showEditProfile ? (
              <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={s.nameEditRow}>
                  <Text style={[s.nameEditLabel, { color: theme.textDim }]}>Nome de usuário</Text>
                  <TextInput
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder="Como você quer ser chamado"
                    placeholderTextColor={theme.textDim}
                    maxLength={40}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    style={[s.nameEditInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
                  />
                  <TouchableOpacity
                    style={[s.nameEditBtn, { backgroundColor: theme.primary, opacity: savingName ? 0.6 : 1 }]}
                    onPress={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName
                      ? <ActivityIndicator size="small" color={theme.bg} />
                      : <Text style={[s.nameEditBtnText, { color: theme.bg }]}>Salvar nome</Text>}
                  </TouchableOpacity>
                </View>

                <View style={[s.nameEditRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <Text style={[s.nameEditLabel, { color: theme.textDim }]}>Nome de usuário</Text>
                  <View style={s.userInputWrap}>
                    <Text style={[s.userAt, { color: theme.textDim }]}>@</Text>
                    <TextInput
                      value={userDraft}
                      onChangeText={t => setUserDraft(t.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                      placeholder="seu.nome"
                      placeholderTextColor={theme.textDim}
                      maxLength={20}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[s.userInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
                    />
                  </View>
                  {userStatus && (
                    <Text style={[s.userHint, { color: userStatus.available ? theme.primary : theme.danger }]}>
                      {userStatus.available ? 'Disponível' : userStatus.reason}
                    </Text>
                  )}
                  <Text style={[s.userHint, { color: theme.textDim }]}>
                    É por ele que um origamista encontra você para vincular como aprendiz.
                  </Text>
                  <TouchableOpacity
                    style={[s.nameEditBtn, { backgroundColor: theme.primary, opacity: (savingUser || userStatus?.available === false) ? 0.5 : 1 }]}
                    onPress={handleSaveUsername}
                    disabled={savingUser || userStatus?.available === false}
                  >
                    {savingUser
                      ? <ActivityIndicator size="small" color={theme.bg} />
                      : <Text style={[s.nameEditBtnText, { color: theme.bg }]}>Salvar nome de usuário</Text>}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={handlePickImage}>
                  <Text style={[s.linkText, { color: theme.primary }]}>Escolher nova foto da galeria</Text>
                  <Feather name="image" size={20} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                  onPress={async () => {
                    setUploadingAvatar(true);
                    await removeAvatar();
                    setUploadingAvatar(false);
                    setShowEditProfile(false);
                  }}
                >
                  <Text style={[s.linkText, { color: theme.danger }]}>Remover foto atual</Text>
                  <Feather name="trash-2" size={20} color={theme.danger} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                  onPress={() => setShowEditProfile(false)}
                >
                  <Text style={[s.linkText, { color: theme.textDim }]}>Voltar</Text>
                  <Feather name="arrow-left" size={20} color={theme.textDim} />
                </TouchableOpacity>
              </View>

            ) : showNotifications ? (
              <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Daily Reminder */}
                <View style={s.notifRow}>
                  <View style={s.notifInfo}>
                    <Text style={[s.notifLabel, { color: theme.text }]}>Lembrete diário</Text>
                    <Text style={[s.notifDesc, { color: theme.textDim }]}>Hora de praticar origami</Text>
                  </View>
                  <Switch
                    value={notifPrefs?.dailyReminder || false}
                    onValueChange={v => handleSaveNotifPrefs({ ...(notifPrefs || {}), dailyReminder: v })}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#fff"
                  />
                </View>
                {notifPrefs?.dailyReminder && (
                  <View style={[s.timeSelector, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <Text style={[s.timeSelectorLabel, { color: theme.textDim }]}>Horário do lembrete</Text>
                    <View style={s.timePills}>
                      {['07:00', '09:00', '12:00', '18:00', '20:00', '22:00'].map(t => {
                        const active = (notifPrefs?.reminderTime || '20:00') === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => handleSaveNotifPrefs({ ...(notifPrefs || {}), reminderTime: t })}
                            style={[s.timePill, { backgroundColor: active ? theme.primary : theme.bg, borderColor: active ? theme.primary : theme.border }]}
                          >
                            <Text style={{ color: active ? '#fff' : theme.textDim, fontSize: 13, fontWeight: '600' }}>{t}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
                {/* Streak Alert */}
                <View style={[s.notifRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <View style={s.notifInfo}>
                    <Text style={[s.notifLabel, { color: theme.text }]}>Alerta de streak</Text>
                    <Text style={[s.notifDesc, { color: theme.textDim }]}>Aviso às 20:00 se não praticou hoje</Text>
                  </View>
                  <Switch
                    value={notifPrefs?.streakAlert || false}
                    onValueChange={v => handleSaveNotifPrefs({ ...(notifPrefs || {}), streakAlert: v })}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#fff"
                  />
                </View>
                {/* Haptics */}
                <View style={[s.notifRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <View style={s.notifInfo}>
                    <Text style={[s.notifLabel, { color: theme.text }]}>Vibração (haptics)</Text>
                    <Text style={[s.notifDesc, { color: theme.textDim }]}>Feedback tátil em botões e conquistas</Text>
                  </View>
                  <Switch
                    value={hapticsEnabled}
                    onValueChange={updateHapticsEnabled}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#fff"
                  />
                </View>
                {/* Efeitos sonoros */}
                <View style={[s.notifRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <View style={s.notifInfo}>
                    <Text style={[s.notifLabel, { color: theme.text }]}>Efeitos sonoros</Text>
                    <Text style={[s.notifDesc, { color: theme.textDim }]}>Sons ao favoritar e desbloquear conquistas</Text>
                  </View>
                  <Switch
                    value={soundsEnabled}
                    onValueChange={updateSoundsEnabled}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#fff"
                  />
                </View>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowNotifications(false)}>
                  <Text style={[s.linkText, { color: theme.textDim }]}>Voltar</Text>
                  <Feather name="arrow-left" size={20} color={theme.textDim} />
                </TouchableOpacity>
              </View>

            ) : showProPage ? (
              <View style={{ gap: 14 }}>
                {/* Hero */}
                <View style={[s.proHero, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '55' }]}>
                  <View style={[s.proHeroBadge, { backgroundColor: theme.primary }]}>
                    <Feather name="star" size={14} color="#fff" />
                    <Text style={s.proHeroBadgeText}>PRO</Text>
                  </View>
                  <Text style={[s.proHeroTitle, { color: theme.text }]}>
                    {user?.isPro ? 'Você é Pro! 🎉' : 'Dobre sem limites'}
                  </Text>
                  <Text style={[s.proHeroSub, { color: theme.textDim }]}>
                    {user?.isPro
                      ? 'Aproveite tudo que o OrigamiApp oferece.'
                      : 'Biblioteca infinita, buscas ilimitadas e seu próprio estúdio de ensino.'}
                  </Text>
                  {!user?.isPro && (
                    <View style={s.proPriceRow}>
                      <Text style={[s.proPrice, { color: theme.primary }]}>R$ 9,90</Text>
                      <Text style={[s.proPricePeriod, { color: theme.textDim }]}>/mês</Text>
                    </View>
                  )}
                </View>

                {/* Comparação Grátis vs Pro */}
                <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={s.compareHeader}>
                    <Text style={[s.compareFeatureCol, { color: theme.textDim, fontSize: 11, fontWeight: '800' }]}>RECURSO</Text>
                    <Text style={[s.compareCol, { color: theme.textDim, fontSize: 11, fontWeight: '800' }]}>GRÁTIS</Text>
                    <Text style={[s.compareCol, { color: theme.primary, fontSize: 11, fontWeight: '800' }]}>PRO</Text>
                  </View>
                  {[
                    { f: 'Origamis salvos',          free: '10',    pro: '∞' },
                    { f: 'Buscas ao vivo no YouTube', free: '3/dia', pro: '∞' },
                    { f: 'Retomar de onde parou',     free: true,    pro: true },
                    { f: 'Conquistas e níveis',       free: true,    pro: true },
                    { f: 'Estúdio do Origamista',     free: false,   pro: true },
                    { f: 'Turmas e atividades',       free: false,   pro: true },
                  ].map((row) => (
                    <View key={row.f} style={[s.compareRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                      <Text style={[s.compareFeatureCol, { color: theme.text, fontSize: 13 }]}>{row.f}</Text>
                      <View style={s.compareCol}>
                        {typeof row.free === 'boolean'
                          ? <Feather name={row.free ? 'check' : 'x'} size={15} color={row.free ? '#22C55E' : theme.textMuted} />
                          : <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600' }}>{row.free}</Text>}
                      </View>
                      <View style={s.compareCol}>
                        {typeof row.pro === 'boolean'
                          ? <Feather name="check" size={15} color={theme.primary} />
                          : <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '800' }}>{row.pro}</Text>}
                      </View>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                {!user?.isPro ? (
                  <TouchableOpacity
                    style={[s.proBtn, { backgroundColor: theme.primary }]}
                    onPress={() => { upgradeToPro(true); setShowProPage(false); handleCloseSettings(); }}
                  >
                    <Text style={[s.proBtnText, { color: '#fff' }]}>Assinar o Pro  →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[s.proBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.danger }]}
                    onPress={() => { downgradeFromPro(); setShowProPage(false); handleCloseSettings(); }}
                  >
                    <Text style={[s.proBtnText, { color: theme.danger }]}>Cancelar assinatura</Text>
                  </TouchableOpacity>
                )}
                {!user?.isPro && (
                  <Text style={{ color: theme.textMuted, fontSize: 11, textAlign: 'center' }}>
                    Cancele quando quiser. Seus origamis salvos permanecem seus.
                  </Text>
                )}
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 0 }]} onPress={() => setShowProPage(false)}>
                  <Text style={[s.linkText, { color: theme.textDim }]}>Voltar</Text>
                  <Feather name="arrow-left" size={20} color={theme.textDim} />
                </TouchableOpacity>
              </View>

            ) : (
              <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TouchableOpacity style={s.linkRow} onPress={() => { setNameDraft(user?.name || ''); setUserDraft(user?.username || ''); setUserStatus(null); setShowEditProfile(true); }}>
                  <Text style={[s.linkText, { color: theme.text }]}>Editar Perfil (Foto)</Text>
                  <Feather name="edit-2" size={20} color={theme.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowRankSelector(true)}>
                  <View>
                    <Text style={[s.linkText, { color: theme.text }]}>Nível de Dobragem</Text>
                    <Text style={{ fontSize: 12, color: ({ 'Iniciante': '#22C55E', 'Intermediário': '#3B82F6', 'Avançado': '#F59E0B' })[user?.rank] || '#22C55E', marginTop: 1 }}>{user?.rank || 'Iniciante'}</Text>
                  </View>
                  <Feather name="bar-chart-2" size={20} color={theme.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowNotifications(true)}>
                  <View>
                    <Text style={[s.linkText, { color: theme.text }]}>Notificações</Text>
                    <Text style={{ fontSize: 12, color: theme.textDim, marginTop: 1 }}>
                      {(notifPrefs?.dailyReminder || notifPrefs?.streakAlert) ? 'Ativas' : 'Desativadas'}
                    </Text>
                  </View>
                  <Feather name="bell" size={20} color={theme.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowProPage(true)}>
                  <View>
                    <Text style={[s.linkText, { color: user?.isPro ? theme.primary : theme.text }]}>Assinatura Pro</Text>
                    <Text style={{ fontSize: 12, color: user?.isPro ? theme.primary : theme.textDim, marginTop: 1 }}>
                      {user?.isPro ? 'Ativo' : 'Plano gratuito'}
                    </Text>
                  </View>
                  <Feather name="star" size={20} color={user?.isPro ? theme.primary : theme.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={handleSupportEmail}>
                  <Text style={[s.linkText, { color: theme.text }]}>Ajuda e Suporte</Text>
                  <Feather name="mail" size={20} color={theme.textDim} />
                </TouchableOpacity>

                {/* Dev: simulate Pro */}
                {isAdminEmail(user?.email) && (
                  !user?.isPro ? (
                    <TouchableOpacity
                      style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                      onPress={() => { upgradeToPro(true); handleCloseSettings(); }}
                    >
                      <Text style={[s.linkText, { color: theme.primary }]}>Simular Conta Pro/Origamista</Text>
                      <Feather name="zap" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                      onPress={() => { downgradeFromPro(); handleCloseSettings(); }}
                    >
                      <Text style={[s.linkText, { color: theme.danger }]}>Remover Conta Pro</Text>
                      <Feather name="zap" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  )
                )}

                <TouchableOpacity
                  style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                  onPress={() => { handleCloseSettings(); logout(); }}
                >
                  <Text style={[s.linkText, { color: theme.danger }]}>Sair da Conta</Text>
                  <Feather name="log-out" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 80 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo:      { fontSize: 22, fontWeight: '800' },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  header: { alignItems: 'center', paddingVertical: 30 },
  avatarWrap: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  proBadge: { position: 'absolute', bottom: -8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  proText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  name: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  email: { fontSize: 14, marginBottom: 24 },
  
  statsContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, width: '100%' },
  statBox: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { paddingHorizontal: 20, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  
  achieveList: { gap: 12 },
  achieveCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  achieveIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  achieveInfo: { flex: 1, marginLeft: 16 },
  achieveTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  achieveDesc: { fontSize: 13 },

  linksCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  linkText: { fontSize: 15, fontWeight: '600' },
  nameEditRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18 },
  nameEditLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  nameEditInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  nameEditBtn: { marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  nameEditBtnText: { fontSize: 15, fontWeight: '700' },
  userInputWrap: { flexDirection: 'row', alignItems: 'center' },
  userAt: { fontSize: 16, fontWeight: '700', marginRight: 6 },
  userInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  userHint: { fontSize: 12, marginTop: 6, lineHeight: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderBottomWidth: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: { padding: 4 },

  // Notifications sub-page
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  notifInfo: { flex: 1, marginRight: 12 },
  notifLabel: { fontSize: 15, fontWeight: '600' },
  notifDesc: { fontSize: 12, marginTop: 2 },
  timeSelector: { padding: 16 },
  timeSelectorLabel: { fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  timePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },

  // Pro sub-page
  proHeader: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  proHeaderTitle: { fontSize: 22, fontWeight: '800' },
  proHeaderSub: { fontSize: 14, textAlign: 'center' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  benefitIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  benefitText: { fontSize: 15, fontWeight: '600' },

  // Paywall Pro
  proHero: { borderRadius: 18, borderWidth: 1.5, padding: 20, alignItems: 'center' },
  proHeroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  proHeroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  proHeroTitle: { fontSize: 24, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  proHeroSub: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  proPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
  proPrice: { fontSize: 32, fontWeight: '900' },
  proPricePeriod: { fontSize: 14, fontWeight: '600', marginBottom: 5 },
  compareHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  compareFeatureCol: { flex: 1 },
  compareCol: { width: 60, alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  proBtn: { borderRadius: 16, padding: 18, alignItems: 'center' },
  proBtnText: { fontSize: 17, fontWeight: '800' },
});
