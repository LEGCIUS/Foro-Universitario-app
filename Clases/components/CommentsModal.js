import React from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/*
  Props:
  - visible: boolean
  - darkMode: boolean
  - comments: [{ usuario, displayName, avatarUrl, texto, created_at }]
  - commentCount: number
  - newComment: string
  - onChangeNewComment: fn
  - onSubmitNewComment: fn
  - onRequestClose: fn
  - meCarnet: string | null
  - onPressAvatar: (carnetUsuario) => void
  - onLongPressComment: (commentObj) => void
*/

export default function CommentsModal({
  visible,
  darkMode = false,
  comments = [],
  commentCount = 0,
  newComment = '',
  onChangeNewComment,
  onSubmitNewComment,
  onRequestClose,
  meCarnet,
  onPressAvatar,
  onLongPressComment,
}) {
  const styles = createStyles(darkMode);

  if (!visible) return null;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={() => onLongPressComment && onLongPressComment(item)}
      style={styles.commentRow}
    >
      <TouchableOpacity onPress={() => onPressAvatar && onPressAvatar(item.usuario)}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{(item.displayName || item.usuario || 'U').charAt(0).toUpperCase()}</Text>
            </View>
        )}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.commentAuthor} numberOfLines={1}>{item.displayName || item.usuario}</Text>
        <Text style={styles.commentText}>{item.texto}</Text>
        {!!item.created_at && (
          <Text style={styles.commentDate}>{new Date(item.created_at).toLocaleString()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        {/* Fondo clickable para cerrar */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
        <View style={styles.card}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>Comentarios ({commentCount})</Text>
          </View>
          <View style={{ flex: 1 }}>
            <FlatList
              data={comments}
              keyExtractor={(item, idx) => `${item.usuario}-${idx}-${item.created_at || ''}`}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>Aún no hay comentarios.</Text>
              )}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            />
            <View style={styles.inputRow}>
              <TextInput
                value={newComment}
                onChangeText={onChangeNewComment}
                placeholder="Escribe un comentario..."
                placeholderTextColor={darkMode ? '#888' : '#888'}
                style={styles.input}
                multiline
              />
              <TouchableOpacity
                onPress={onSubmitNewComment}
                disabled={!newComment.trim()}
                style={[styles.sendBtn, { opacity: newComment.trim() ? 1 : 0.5 }]}
              >
                <MaterialIcons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const H = Dimensions.get('window').height;
const createStyles = (darkMode) => StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end', alignItems:'stretch' },
  card: { width:'100%', maxWidth:'100%', maxHeight: Math.floor(H * 0.9), minHeight: Math.floor(H * 0.6), backgroundColor: darkMode ? '#181818' : '#fff', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16 },
  grabber: { alignSelf:'center', width:48, height:4, borderRadius:2, backgroundColor: darkMode ? '#444' : '#ddd', marginBottom:8 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  title: { fontSize:16, fontWeight:'700', color: darkMode ? '#fff' : '#111' },
  closeBtn: { display:'none' },
  commentRow: { flexDirection:'row', marginBottom:12, alignItems:'flex-start' },
  avatar: { width:36, height:36, borderRadius:18, marginRight:10 },
  avatarFallback: { backgroundColor: darkMode ? '#333' : '#e0e0e0', justifyContent:'center', alignItems:'center' },
  avatarLetter: { fontSize:14, fontWeight:'700', color: darkMode ? '#fff' : '#222' },
  commentAuthor: { fontSize:13, fontWeight:'600', color: darkMode ? '#fff' : '#111' },
  commentText: { fontSize:13, color: darkMode ? '#ddd' : '#333', marginTop:2 },
  commentDate: { fontSize:11, color: darkMode ? '#888' : '#666', marginTop:2 },
  emptyText: { textAlign:'center', color: darkMode ? '#999' : '#666', marginTop:4 },
  inputRow: { flexDirection:'row', marginTop:12, alignItems:'flex-end' },
  input: { flex:1, borderWidth:1, borderColor: darkMode ? '#333' : '#e0e0e0', borderRadius:10, padding:10, minHeight:40, maxHeight:120, color: darkMode ? '#fff' : '#111', backgroundColor: darkMode ? '#111' : '#fafafa' },
  sendBtn: { marginLeft:8, backgroundColor:'#007AFF', paddingVertical:10, paddingHorizontal:14, borderRadius:10, justifyContent:'center', alignItems:'center' },
});
