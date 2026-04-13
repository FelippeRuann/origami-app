import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Alert, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

/**
 * Componente ForcaSenha: Mostra uma barrinha visual indicando se a senha é fraca, média ou forte.
 */
function ForcaSenha({ forca = 2, theme }) {
  const cores = [theme.danger, theme.warning, theme.primary];
  const labels = ['Fraca', 'Média', 'Forte'];
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{
            flex: 1, height: 3, borderRadius: 3,
            backgroundColor: i <= forca ? cores[forca] : 'rgba(255,255,255,0.1)',
          }} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: cores[forca] }}>Senha {labels[forca]}</Text>
    </View>
  );
}

/**
 * Auth: Tela responsável por toda a parte de autenticação (Login, Cadastro e Tela Inicial Pública).
 */
export default function Auth() {
  // --- ESTADOS DA TELA ---
  // Controla qual "página" de autenticação estamos vendo: 'initial' (boas vindas), 'login' ou 'register'
  const [step, setStep] = useState('initial'); 
  
  // Dados do formulário de cadastro
  const [nivel, setNivel] = useState('Iniciante');
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarIcon, setAvatarIcon] = useState('star'); // Ícone padrão se não escolher foto
  const [avatarImageUri, setAvatarImageUri] = useState(null); // Foto da galeria
  
  // Estados de controle de interface
  const [loading, setLoading] = useState(false); // Mostra "Carregando..." nos botões
  const [showPassword, setShowPassword] = useState(false); // Alterna a visibilidade da senha (olhinho)
  
  // Puxando funções do nosso contexto global
  const { login, register, theme, resetPassword } = useApp();

  // Função simples para calcular a força da senha
  const calcularForcaSenha = (senha) => {
    if (!senha || senha.length < 6) return 0; // Fraca
    if (senha.length >= 8 && /[A-Z]/.test(senha) && /[0-9]/.test(senha)) return 2; // Forte
    return 1; // Média
  };

  // --- FUNÇÕES DE AÇÃO ---

  // Chamada quando o usuário clica em "Entrar"
  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      let mensagem = "Erro ao fazer login.";
      if (result.error.includes('invalid-email')) mensagem = "E-mail inválido. Verifique se você digitou corretamente.";
      if (result.error.includes('user-not-found') || result.error.includes('invalid-credential')) mensagem = "E-mail ou senha incorretos.";
      if (result.error.includes('too-many-requests')) mensagem = "Muitas tentativas. Tente novamente mais tarde.";
      Alert.alert("Ops!", mensagem);
    }
  };

  // Chamada quando o usuário clica em "Criar minha conta"
  const handleRegister = async () => {
    // Validações antes de enviar para o Firebase
    if (!aceitaTermos) {
      Alert.alert("Atenção", "Você precisa aceitar os Termos de Uso para criar uma conta.");
      return;
    }
    if (!username || username.length < 3) {
      Alert.alert("Atenção", "O nome de usuário deve ter pelo menos 3 caracteres.");
      return;
    }
    if (!email || !password) return;
    
    if (password.length < 6) {
      Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    // Chama a função register do AppContext
    const result = await register(email, password, username, avatarIcon, nivel, avatarImageUri);
    setLoading(false);
    
    // Tratamento de erros amigável para o usuário
    if (!result.success) {
      let mensagem = "Erro ao criar conta.";
      if (result.error.includes('invalid-email')) mensagem = "E-mail inválido. Verifique se você digitou corretamente (ex: nome@email.com).";
      if (result.error.includes('email-already-in-use')) mensagem = "Este e-mail já está cadastrado. Tente fazer login.";
      if (result.error.includes('weak-password')) mensagem = "A senha é muito fraca. Escolha uma senha mais forte.";
      Alert.alert("Ops!", mensagem);
    }
  };

  // Chamada quando clica em "Esqueci minha senha"
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Atenção", "Por favor, digite seu e-mail no campo acima para redefinir a senha.");
      return;
    }
    const result = await resetPassword(email);
    if (result.success) {
      Alert.alert("Sucesso", "E-mail de redefinição enviado! Verifique sua caixa de entrada.");
    } else {
      Alert.alert("Erro", "Erro ao redefinir senha: " + result.error);
    }
  };

  // --- RENDERIZAÇÃO DAS TELAS ---

  // 1. TELA INICIAL (Boas-vindas)
  if (step === 'initial') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Elementos decorativos de fundo */}
        <View style={[styles.circuloGrande, { backgroundColor: theme.secondary }]} />
        <View style={[styles.circuloPequeno, { backgroundColor: theme.card }]} />
        <View style={[styles.circuloMeio, { borderColor: theme.primary }]} />

        <View style={styles.centro}>
          <View style={styles.logoWrap}>
            <View style={[styles.logoCirculo, { backgroundColor: theme.secondary, borderColor: theme.primary, shadowColor: theme.primary }]}>
              <Feather name="feather" size={48} color={theme.primary} />
            </View>
            <View style={[styles.logoDot, { backgroundColor: theme.primary }]} />
          </View>

          <Text style={[styles.titulo, { color: theme.text }]}>OrigamiApp</Text>
          <Text style={[styles.subtitulo, { color: theme.textMuted }]}>
            Descubra, organize e compartilhe{'\n'}suas criações de origami
          </Text>
        </View>

        <View style={styles.base}>
          {/* Botões que mudam o estado 'step' para mostrar a tela certa */}
          <TouchableOpacity style={[styles.btnPrimario, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={() => setStep('login')}>
            <Text style={[styles.btnPrimarioText, { color: theme.bg }]}>Começar agora</Text>
          </TouchableOpacity> 
          
          <TouchableOpacity style={[styles.btnSecundario, { borderColor: theme.border }]} onPress={() => setStep('register')}>
            <Text style={[styles.btnSecundarioText, { color: theme.text }]}>Criar conta</Text>
          </TouchableOpacity> 
        
          <Text style={[styles.termos, { color: theme.textDim }]}>
            Ao continuar, você aceita os{' '}
            <Text style={{ color: theme.primary }}>Termos de Uso</Text>
            {' '}e a{' '}
            <Text style={{ color: theme.primary }}>Política de Privacidade</Text>
          </Text>
        </View>
      </View>
    );
  }

  // 2. TELA DE LOGIN
  if (step === 'login') {
    return (
      // KeyboardAvoidingView empurra a tela pra cima quando o teclado abre
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.bgTop, { backgroundColor: theme.secondary }]} />

        <View style={styles.header}>
          <TouchableOpacity style={[styles.voltar, { backgroundColor: theme.surface }]} onPress={() => setStep('initial')}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={[styles.logoMini, { backgroundColor: theme.secondary, borderColor: theme.primary }]}>
            <Feather name="feather" size={20} color={theme.primary} />
          </View>
        </View>

        <View style={styles.tituloWrap}>
          <Text style={[styles.tituloScreen, { color: theme.text }]}>Bem-vindo de volta</Text>
          <Text style={[styles.subtituloScreen, { color: theme.textMuted }]}>Entre para continuar dobrando</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.campo}>
            <Text style={[styles.campoLabel, { color: theme.textDim }]}>E-mail</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Feather name="mail" size={16} color={theme.textDim} />
              <TextInput 
                style={[styles.input, { color: theme.text }]} 
                placeholder="seu@email.com" 
                placeholderTextColor={theme.textDim} 
                keyboardType="email-address" 
                autoCapitalize="none" 
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.campo}>
            <Text style={[styles.campoLabel, { color: theme.textDim }]}>Senha</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Feather name="lock" size={16} color={theme.textDim} />
              <TextInput 
                style={[styles.input, { color: theme.text }]} 
                placeholder="••••••••" 
                placeholderTextColor={theme.textDim} 
                secureTextEntry={!showPassword} 
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 24 }} onPress={handleForgotPassword}>
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnEntrar, { backgroundColor: theme.primary, shadowColor: theme.primary, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={[styles.btnEntrarText, { color: theme.bg }]}>
              {loading ? "Entrando..." : "Entrar"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLinha, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textDim }]}>ou continue com</Text>
            <View style={[styles.dividerLinha, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.sociais}>
            {[['chrome', 'Google'], ['smartphone', 'Celular']].map(([icon, label]) => (
              <TouchableOpacity key={label} style={[styles.btnSocial, { borderColor: theme.border, backgroundColor: theme.bg }]} onPress={() => login(label.toLowerCase())}>
                <Feather name={icon} size={18} color={theme.text} />
                <Text style={[styles.btnSocialText, { color: theme.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.rodape}>
          <Text style={[styles.rodapeText, { color: theme.textMuted }]}>Não tem conta? </Text>
          <TouchableOpacity onPress={() => setStep('register')}>
            <Text style={[styles.rodapeLink, { color: theme.primary }]}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // 3. TELA DE CADASTRO (Se não for 'initial' nem 'login', cai aqui)
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={[styles.bgCircle1, { backgroundColor: theme.card }]} />
      <View style={[styles.bgCircle2, { backgroundColor: theme.secondary }]} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.voltar, { backgroundColor: theme.surface }]} onPress={() => setStep('initial')}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Criar conta</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Seção de escolha de Foto de Perfil */}
      <View style={styles.avatarSection}>
        <TouchableOpacity 
          style={[styles.avatarGrande, { backgroundColor: theme.secondary, borderColor: theme.primary, shadowColor: theme.primary }]}
          onPress={async () => {
            // Pede permissão para acessar a galeria de fotos
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert("Atenção", "Precisamos da sua permissão para acessar a galeria!");
              return;
            }
            // Abre a galeria para o usuário escolher a foto
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
            });
            if (!result.canceled) {
              setAvatarImageUri(result.assets[0].uri); // Salva a foto escolhida no estado
            }
          }}
        >
          {avatarImageUri ? (
            <Image source={{ uri: avatarImageUri }} style={{ width: '100%', height: '100%', borderRadius: 45 }} />
          ) : (
            <Feather name={avatarIcon} size={52} color={theme.primary} />
          )}
          <View style={[styles.editBadge, { backgroundColor: theme.primary, borderColor: theme.bg }]}>
            <Feather name="camera" size={12} color={theme.bg} />
          </View>
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.trocarAvatar, { borderColor: theme.primary }]}
            onPress={() => {
              setAvatarImageUri(null); // Remove a imagem se escolher trocar o ícone
              const icons = ['star', 'heart', 'smile', 'sun', 'moon', 'coffee', 'feather', 'anchor', 'music', 'camera'];
              const next = icons[(icons.indexOf(avatarIcon) + 1) % icons.length];
              setAvatarIcon(next);
            }}
          >
            <Text style={[styles.trocarAvatarText, { color: theme.primary }]}>Trocar ícone</Text>
          </TouchableOpacity>
          
          {avatarImageUri && (
            <TouchableOpacity 
              style={[styles.trocarAvatar, { borderColor: theme.danger }]}
              onPress={() => setAvatarImageUri(null)}
            >
              <Text style={[styles.trocarAvatarText, { color: theme.danger }]}>Remover foto</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.campo}>
          <Text style={[styles.campoLabel, { color: theme.textDim }]}>Nome de usuário</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Feather name="user" size={16} color={theme.textDim} />
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              placeholder="ex: paper.crane" 
              placeholderTextColor={theme.textDim} 
              autoCapitalize="none" 
              value={username}
              onChangeText={setUsername}
            />
            {username.length >= 3 && (
              <View style={[styles.disponivelBadge, { backgroundColor: theme.primary }]}>
                <Feather name="check" size={12} color={theme.bg} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={[styles.campoLabel, { color: theme.textDim }]}>E-mail</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Feather name="mail" size={16} color={theme.textDim} />
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              placeholder="seu@email.com" 
              placeholderTextColor={theme.textDim} 
              keyboardType="email-address" 
              autoCapitalize="none" 
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={[styles.campoLabel, { color: theme.textDim }]}>Senha</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Feather name="lock" size={16} color={theme.textDim} />
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              placeholder="Mínimo 8 caracteres" 
              placeholderTextColor={theme.textDim} 
              secureTextEntry={!showPassword} 
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4, marginRight: 6 }}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={theme.textDim} />
            </TouchableOpacity>
          </View>
          <ForcaSenha forca={calcularForcaSenha(password)} theme={theme} />
        </View>

        <View style={styles.campo}>
          <Text style={[styles.campoLabel, { color: theme.textDim }]}>Nível de origami</Text>
          <View style={styles.nivelRow}>
            {['Iniciante', 'Intermediário', 'Avançado'].map((n) => (
              <TouchableOpacity key={n} onPress={() => setNivel(n)} style={[styles.nivelBtn, { borderColor: theme.border }, nivel === n && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                <Text style={[styles.nivelBtnText, { color: theme.textDim }, nivel === n && { color: theme.bg, fontWeight: '800' }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.termosRow} onPress={() => setAceitaTermos(!aceitaTermos)} activeOpacity={0.8}>
          <View style={[styles.checkbox, { borderColor: theme.border, borderWidth: aceitaTermos ? 0 : 1.5 }, aceitaTermos && { backgroundColor: theme.primary }]}>
            {aceitaTermos && <Feather name="check" size={12} color={theme.bg} />}
          </View>
          <Text style={[styles.termosText, { color: theme.textDim }]}>
            Aceito os <Text style={{ color: theme.primary }}>Termos de Uso</Text> e a <Text style={{ color: theme.primary }}>Política de Privacidade</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btnCriar, { backgroundColor: theme.primary, shadowColor: theme.primary, opacity: loading ? 0.7 : 1 }]} 
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={[styles.btnCriarText, { color: theme.bg }]}>
            {loading ? "Criando..." : "Criar minha conta"}
          </Text>
          <Feather name="arrow-right" size={20} color={theme.bg} />
        </TouchableOpacity>
      </View>

      <View style={styles.rodape}>
        <Text style={[styles.rodapeText, { color: theme.textMuted }]}>Já tem conta? </Text>
        <TouchableOpacity onPress={() => setStep('login')}>
          <Text style={[styles.rodapeLink, { color: theme.primary }]}>Entrar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  // Initial
  circuloGrande: { position: 'absolute', width: 400, height: 400, borderRadius: 200, top: -100, right: -100, opacity: 0.8 },
  circuloPequeno: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: 100, left: -60, opacity: 0.5 },
  circuloMeio: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, bottom: 200, right: 20, opacity: 0.2 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  logoWrap: { position: 'relative', marginBottom: 24 },
  logoCirculo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  logoDot: { position: 'absolute', width: 20, height: 20, borderRadius: 10, bottom: 4, right: 4 },
  titulo: { fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  subtitulo: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  base: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  btnPrimario: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  btnPrimarioText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  btnSecundario: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5 },
  btnSecundarioText: { fontSize: 15, fontWeight: '600' },
  termos: { fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 4 },

  // Login
  bgTop: { position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: 150, opacity: 0.8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  voltar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoMini: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tituloWrap: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  tituloScreen: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subtituloScreen: { fontSize: 14 },
  card: { marginHorizontal: 16, borderRadius: 24, padding: 22, borderWidth: 1 },
  campo: { marginBottom: 16 },
  campoLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 14 },
  btnEntrar: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  btnEntrarText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLinha: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  sociais: { flexDirection: 'row', gap: 12 },
  btnSocial: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5 },
  btnSocialText: { fontSize: 13, fontWeight: '600' },
  rodape: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 20 },
  rodapeText: { fontSize: 14 },
  rodapeLink: { fontSize: 14, fontWeight: '700' },

  // Register
  bgCircle1: { position: 'absolute', width: 250, height: 250, borderRadius: 125, top: -60, right: -60, opacity: 0.4 },
  bgCircle2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: 40, right: 40, opacity: 0.6 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 20 },
  avatarGrande: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  trocarAvatar: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  trocarAvatarText: { fontSize: 12, fontWeight: '600' },
  form: { paddingHorizontal: 20, gap: 6 },
  disponivelBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  disponivelText: { fontSize: 11, fontWeight: '800' },
  nivelRow: { flexDirection: 'row', gap: 8 },
  nivelBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  nivelBtnText: { fontSize: 11, fontWeight: '600' },
  termosRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  termosText: { fontSize: 12, lineHeight: 18, flex: 1 },
  btnCriar: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  btnCriarText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
