import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, TextInput, ScrollView, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function Publications({ route, navigation }) {
  const { posts, initialIndex, darkMode } = route.params;
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [likes, setLikes] = useState(posts[currentIndex]?.likes || 0);
  const [comments, setComments] = useState(posts[currentIndex]?.comentarios || []);
  const [newComment, setNewComment] = useState('');
  const flatListRef = useRef();

  const onViewableItemsChanged = React.useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      setCurrentIndex(idx);
      setLikes(posts[idx]?.likes || 0);
      setComments(posts[idx]?.comentarios || []);
    }
  });

  const viewConfigRef = React.useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleLike = () => setLikes(likes + 1);

  const handleAddComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { usuario: 'Tú', texto: newComment }]);
      setNewComment('');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.detailContainer}>
      {/* Quita la X de aquí */}
      <View style={styles.mediaContainer}>
        {item.contenido === 'image' && item.archivo_url && (
          <Image
            source={{ uri: item.archivo_url }}
            style={styles.media}
            resizeMode="contain"
          />
        )}
        {item.contenido === 'video' && item.archivo_url && (
          <Video
            source={{ uri: item.archivo_url }}
            style={styles.media}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
        )}
      </View>
      <Text style={styles.title}>{item.titulo}</Text>
      <View style={styles.likesRow}>
        <TouchableOpacity onPress={handleLike} style={{ marginRight: 8 }}>
          <MaterialIcons name="thumb-up" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={{ color: darkMode ? "#222" : "#222" }}>{likes} Me gusta</Text>
      </View>
      <Text style={[styles.commentsTitle, darkMode && { color: "#222" }]}>Comentarios:</Text>
      <ScrollView style={styles.commentsList}>
        {comments.length === 0 ? (
          <Text style={{ color: '#888' }}>Sin comentarios.</Text>
        ) : (
          comments.map((c, idx) => (
            <Text key={idx} style={{ marginBottom: 2, color: darkMode ? "#222" : "#222" }}>
              <Text style={{ fontWeight: 'bold' }}>{c.usuario}: </Text>
              {c.texto}
            </Text>
          ))
        )}
      </ScrollView>
      <View style={styles.commentInputRow}>
        <TextInput
          style={[styles.input, { flex: 1, height: 40, marginBottom: 0, color: darkMode ? "#222" : "#222" }]}
          placeholder="Escribe un comentario..."
          placeholderTextColor={darkMode ? "#aaa" : "#888"}
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity onPress={handleAddComment} style={{ marginLeft: 8 }}>
          <MaterialIcons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.overlay}>
      {/* X fija arriba a la derecha */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.closeButton}
      >
        <MaterialIcons name="close" size={32} color="#FF3B30" />
      </TouchableOpacity>
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={(_, idx) => idx.toString()}
        pagingEnabled
        horizontal={false}
        initialScrollIndex={currentIndex}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewConfigRef.current}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        snapToInterval={height}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 20,
    backgroundColor: 'transparent',
    padding: 4,
  },
  detailContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#222',
    textAlign: 'center',
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#222',
    alignSelf: 'flex-start',
  },
  commentsList: {
    maxHeight: 100,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  input: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});