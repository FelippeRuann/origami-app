import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
// Importe o 'db' do arquivo firebase.js que você criou!
// Ajuste o caminho '../src/firebase' dependendo de onde você salvou este arquivo
import { db } from '../firebase'; 
import { collection, addDoc } from 'firebase/firestore';

export default function TestFirebase() {
  const [nomeOrigami, setNomeOrigami] = useState('');

  const salvarNoFirebase = async () => {
    if (nomeOrigami.trim() === '') {
      Alert.alert('Erro', 'Digite o nome de um origami!');
      return;
    }

    try {
      // Aqui é a mágica! Estamos dizendo: "Vá na coleção 'origamis' e adicione este documento"
      const docRef = await addDoc(collection(db, 'origamis'), {
        nome: nomeOrigami,
        dataCriacao: new Date().toISOString(),
      });
      
      Alert.alert('Sucesso!', `Origami salvo com a ID: ${docRef.id}`);
      setNomeOrigami(''); // Limpa o campo
    } catch (error) {
      console.error("Erro ao adicionar documento: ", error);
      Alert.alert('Erro', 'Não foi possível salvar no Firebase.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Teste do Firebase</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Nome do Origami (ex: Tsuru)"
        value={nomeOrigami}
        onChangeText={setNomeOrigami}
      />
      
      <Button title="Salvar na Nuvem" onPress={salvarNoFirebase} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
});