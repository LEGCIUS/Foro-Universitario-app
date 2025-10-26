import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, TextInput, ScrollView, Dimensions, Modal } from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function Publications({ route, navigation }) {
  const { posts, initialIndex = 0, darkMode } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [likes, setLikes] = useState(posts[initialIndex]?.likes || 0);
  const [comments, setComments] = useState(posts[initialIndex]?.comentarios || []);
  const [newComment, setNewComment] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const flatListRef = useRef();
  const videoRefs = useRef([]);

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

  const renderItem = ({ item, index }) => (
    <View style={styles.detailContainer}>
      {/* Header: avatar + username */}
      <View style={styles.headerRow}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarLetter}>{(item.usuario_nombre || item.usuario || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{item.usuario_nombre || item.usuario || 'Usuario'}</Text>
      </View>
      <View style={styles.mediaContainer}>
        {item.contenido === 'image' && item.archivo_url && (
          <Image
            source={{ uri: item.archivo_url }}
            style={styles.feedMedia}
            resizeMode="cover"
          />
        )}
        {item.contenido === 'video' && item.archivo_url && (
          <Video
            ref={ref => videoRefs.current[index] = ref}
            source={{ uri: item.archivo_url }}
            style={styles.feedMedia}
            useNativeControls
            resizeMode="cover"
            isLooping
          />
        )}
      </View>
      {/* Actions row (like, comment, share, bookmark) */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
            <MaterialIcons name="favorite-border" size={26} color="#222" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialIcons name="chat-bubble-outline" size={26} color="#222" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialIcons name="share" size={26} color="#222" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.actionBtn}>
          <MaterialIcons name="bookmark-border" size={26} color="#222" />
        </TouchableOpacity>
      </View>
      <Text style={styles.captionTitle}>{item.titulo}</Text>
      <View style={styles.likesRow}>
        <Text style={styles.likesText}>{likes} Me gusta</Text>
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

  React.useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (video && idx !== currentIndex) {
        video.pauseAsync && video.pauseAsync();
      }
    });
  }, [currentIndex]);

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
        initialScrollIndex={initialIndex}
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
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index, animated: true });
          }, 100);
        }}
      />

      {/* Modal para mostrar la publicación seleccionada */}
      <Modal
        visible={!!selectedPost}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPost(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setSelectedPost(null)} // Cierra al tocar fuera
        >
          <View style={styles.centeredView}>
            <View style={styles.modalContent}>
              {/* Aquí el contenido de la publicación */}
              {selectedPost?.contenido === 'image' && (
                <Image
                  source={{ uri: selectedPost.archivo_url }}
                  style={styles.modalMedia}
                  resizeMode="contain"
                />
              )}
              {selectedPost?.contenido === 'video' && (
                <Video
                  source={{ uri: selectedPost.archivo_url }}
                  style={styles.modalMedia}
                  useNativeControls
                  resizeMode="contain"
                  isLooping
                />
              )}
              <Text style={styles.modalTitle}>{selectedPost?.titulo}</Text>
              {/* Likes, comentarios, etc. */}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 18,
    zIndex: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 6,
    borderRadius: 18,
    elevation: 6,
  },
  detailContainer: {
    width: width,
    height: height,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 0, // sin padding horizontal para que el media ocupe todo el ancho
    backgroundColor: '#f7f9fc',
  },
  mediaContainer: {
    width: width,
    aspectRatio: 1, // cuadrado como Instagram feed; usamos 'cover' para rellenar sin bandas
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: undefined,
  },
  feedMedia: {
    width: width,
    height: width, // cuadrado perfecto
  },
  modalMedia: {
    width: 320,
    height: 320,
    borderRadius: 12,
    marginBottom: 12,
  },
  headerRow: {
    width: '100%',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6eef8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarLetter: { fontWeight: '700', color: '#0b2545' },
  username: { fontSize: 16, fontWeight: '700', color: '#0b2545' },
  actionsRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  leftActions: { flexDirection: 'row' },
  actionBtn: { marginRight: 12 },
  captionTitle: { fontSize: 16, fontWeight: '700', color: '#0b2545', paddingHorizontal: 10, marginBottom: 6 },
  likesText: { color: '#222', paddingHorizontal: 10, marginBottom: 6 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    color: '#0b2545',
    textAlign: 'left',
    alignSelf: 'stretch',
    marginLeft: 6,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'stretch',
    marginLeft: 6,
  },
  commentsTitle: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#233547',
    alignSelf: 'flex-start',
    marginLeft: 6,
  },
  commentsList: {
    maxHeight: 120,
    marginBottom: 8,
    alignSelf: 'stretch',
    paddingHorizontal: 6,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'stretch',
    paddingHorizontal: 6,
  },
  input: {
    borderColor: '#e1e7ef',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)', // Fondo semitransparente
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    width: '92%',
    maxWidth: 420,
    alignItems: 'center',
    elevation: 10,
  },
  media: {
    width: 320,
    height: 320,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0b2545',
    textAlign: 'center',
  },
});