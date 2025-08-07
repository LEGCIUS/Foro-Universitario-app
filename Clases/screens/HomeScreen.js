import React, { useState } from 'react';
import { View, Text, Button, FlatList, TextInput, StyleSheet } from 'react-native';

export default function HomeScreen({ onLogout }) {
  const [posts, setPosts] = useState([
    { id: '1', text: '¡Bienvenido al foro universitario!' },
    { id: '2', text: 'Recuerda revisar las reglas antes de publicar.' },
  ]);
  const [newPost, setNewPost] = useState('');

  const handleAddPost = () => {
    if (newPost.trim() !== '') {
      setPosts([
        { id: Date.now().toString(), text: newPost },
        ...posts,
      ]);
      setNewPost('');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Bienvenido a la pantalla principal</Text>
        <Button title="Cerrar sesión" onPress={onLogout} />
      </View>
      <View style={styles.addPostContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe una publicación..."
          value={newPost}
          onChangeText={setNewPost}
        />
        <Button title="Publicar" onPress={handleAddPost} />
      </View>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.postItem}>
            <Text>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.feed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 18,
    marginBottom: 8,
  },
  addPostContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
  },
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  feed: {
    paddingBottom: 16,
  },
});
