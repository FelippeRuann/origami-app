import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';

export default function ResetPasswordScreen({ oobCode, onSuccess }) {
  const { theme } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Senha curta', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert('Senhas diferentes', 'As senhas não coincidem. Verifique e tente novamente.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setDone(true);
    } catch (e) {
      const msgs = {
        'auth/expired-action-code': 'O código expirou. Solicite um novo e-mail de recuperação.',
        'auth/invalid-action-code': 'Código inválido ou já utilizado. Solicite um novo.',
        'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
        'auth/user-disabled': 'Esta conta foi desativada.',
      };
      Alert.alert('Erro', msgs[e.code] || 'Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <View style={s.content}>
          <View style={[s.iconWrap, { backgroundColor: '#22c55e22' }]}>
            <Feather name="check-circle" size={48} color="#22c55e" />
          </View>
          <Text style={[s.title, { color: theme.text }]}>Senha redefinida!</Text>
          <Text style={[s.sub, { color: theme.textMuted }]}>
            Sua senha foi alterada com sucesso. Faça login com a nova senha.
          </Text>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: theme.primary }]}
            onPress={onSuccess}
          >
            <Text style={[s.btnText, { color: theme.bg }]}>Ir para o login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.content}>
        <View style={[s.iconWrap, { backgroundColor: theme.secondary }]}>
          <Feather name="lock" size={32} color={theme.primary} />
        </View>
        <Text style={[s.title, { color: theme.text }]}>Nova senha</Text>
        <Text style={[s.sub, { color: theme.textMuted }]}>
          Escolha uma senha segura para continuar.
        </Text>

        <View style={[s.inputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="lock" size={16} color={theme.textDim} />
          <TextInput
            style={[s.input, { color: theme.text }]}
            placeholder="Nova senha (mín. 6 caracteres)"
            placeholderTextColor={theme.textDim}
            secureTextEntry={!showPw}
            value={newPassword}
            onChangeText={setNewPassword}
            autoFocus
          />
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
            <Feather name={showPw ? 'eye' : 'eye-off'} size={18} color={theme.textDim} />
          </TouchableOpacity>
        </View>

        <View style={[s.inputWrap, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 12 }]}>
          <Feather name="check" size={16} color={theme.textDim} />
          <TextInput
            style={[s.input, { color: theme.text }]}
            placeholder="Confirmar nova senha"
            placeholderTextColor={theme.textDim}
            secureTextEntry={!showPw}
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={[s.btnText, { color: theme.bg }]}>
            {loading ? 'Redefinindo...' : 'Confirmar nova senha'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 28 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, gap: 10,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 14 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  btnText: { fontSize: 16, fontWeight: '800' },
});
