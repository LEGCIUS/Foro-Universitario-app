import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, ScrollView, Dimensions, Share, Pressable, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase/supabaseClient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PublicationModal({
  visible,
  darkMode = false,
  post,
  onClose,
  liked = false,
  likesCount = 0,
  onPressLike,
  commentCount = 0,
  onPressComments,
  canDelete = false,
  onPressDelete,
  canReport = false,
  onPressReport,
  sharePayload, // optional { title, message, url }
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportText, setReportText] = useState('');

  if (!post) return null;

  const handleShare = async () => {
    try {
      const title = sharePayload?.title || post.titulo || 'Publicación';
      const message = sharePayload?.message || post.descripcion || post.titulo || '';
      const url = sharePayload?.url || post.archivo_url || '';
      const content = url ? `${message}\n${url}` : message;
      await Share.share({ message: content, title });
    } catch (e) {
      // no-op
    }
  };

  const overlayMenuAvailable = canDelete || canReport;

  const handleClose = () => {
    setMenuOpen(false);
    setShowZoom(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{ flex:1, justifyContent:'center', alignItems:'stretch', backgroundColor:'rgba(0,0,0,0.7)' }}
        onPress={handleClose}
      >
        <View style={{ width:'100%' }}>
          <TouchableOpacity
            activeOpacity={1}
            onStartShouldSetResponder={() => true}
            onPress={() => setMenuOpen(false)}
            style={{
              backgroundColor: darkMode ? '#121212' : '#fff',
              borderRadius: 0,
              paddingHorizontal: 20,
              paddingVertical: 16,
              elevation: 6,
              marginTop: 0,
              marginBottom: 0,
              alignSelf: 'stretch',
              overflow: 'visible',
              maxHeight: SCREEN_HEIGHT * 0.92,
            }}
          >
            {overlayMenuAvailable && (
              <View style={{ position:'absolute', top:16, right:16, zIndex:20, alignItems:'flex-end' }}>
                <TouchableOpacity
                  onPress={() => setMenuOpen(!menuOpen)}
                  style={{ backgroundColor:'rgba(0,0,0,0.6)', borderRadius:24, padding:8 }}
                >
                  <MaterialIcons name="more-vert" size={24} color="#fff" />
                </TouchableOpacity>
                {menuOpen && (
                  <View style={{
                    position:'absolute', top:40, right:0,
                    backgroundColor: darkMode ? '#1b1b1b' : '#fff',
                    borderRadius:8, paddingVertical:4, paddingHorizontal:8,
                    minWidth:140, elevation:6,
                    shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.25, shadowRadius:4,
                  }}>
                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => { setMenuOpen(false); onPressDelete && onPressDelete(post); }}
                        style={{ paddingHorizontal:12, paddingVertical:8, alignItems:'center', flexDirection:'row' }}
                      >
                        <MaterialIcons name="delete" size={18} color="#FF3B30" />
                        <Text style={{ marginLeft:8, fontSize:16, fontWeight:'500', color: darkMode ? '#fff' : '#FF3B30' }}>Eliminar</Text>
                      </TouchableOpacity>
                    )}
                    {canReport && (
                      <TouchableOpacity
                        onPress={() => { setMenuOpen(false); setReportModalVisible(true); }}
                        style={{ paddingHorizontal:12, paddingVertical:8, alignItems:'center', flexDirection:'row' }}
                      >
                        <MaterialIcons name="flag" size={18} color="#FF3B30" />
                        <Text style={{ marginLeft:8, fontSize:16, fontWeight:'500', color: darkMode ? '#fff' : '#FF3B30' }}>Reportar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              directionalLockEnabled={true}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {post?.contenido === 'image' && !!post.archivo_url && (
                <>
                  <TouchableOpacity onPress={() => setShowZoom(true)}>
                    <Image
                      source={{ uri: post.archivo_url }}
                      style={{ width:'100%', height:400, borderRadius:8, marginBottom:12, backgroundColor:'#000' }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Modal visible={showZoom} transparent onRequestClose={() => setShowZoom(false)}>
                    <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.95)' }}>
                      <TouchableOpacity activeOpacity={1} style={{ flex:1 }} onPress={() => setShowZoom(false)}>
                        <Image source={{ uri: post.archivo_url }} style={{ width:'100%', height:'100%', resizeMode:'contain' }} />
                      </TouchableOpacity>
                    </View>
                  </Modal>
                </>
              )}
              {post?.contenido === 'video' && !!post.archivo_url && (
                <Video
                  key={videoKey}
                  source={{ uri: post.archivo_url }}
                  style={{ width:'100%', height:400, borderRadius:8, marginBottom:12, backgroundColor:'#000' }}
                  useNativeControls
                  resizeMode="contain"
                  onEnd={() => setVideoKey(prev => prev + 1)}
                />
              )}

              {!!post?.titulo && (
                <Text style={{ fontSize:18, fontWeight:'bold', marginBottom:12, color: darkMode ? '#fff' : '#222' }}>
                  {post.titulo}
                </Text>
              )}
              {!!(post?.descripcion || post?.titulo) && (
                <Text style={{ color: darkMode ? '#ddd' : '#444', fontSize:15, marginBottom:8 }}>
                  {post.descripcion || post.titulo}
                </Text>
              )}

              <View style={{ flexDirection:'row', alignItems:'center', paddingVertical:8 }}>
                <TouchableOpacity onPress={onPressLike} activeOpacity={0.7} style={{ flexDirection:'row', alignItems:'center', marginRight:18 }}>
                  <MaterialIcons name={liked ? 'favorite' : 'favorite-border'} size={22} color={liked ? '#e74c3c' : (darkMode ? '#eee' : '#222')} />
                  <Text style={{ fontSize:13, color: darkMode ? '#ddd' : '#444', marginLeft:6, fontWeight:'500' }}>{Math.max(0, likesCount)}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={{ flexDirection:'row', alignItems:'center', marginRight:18 }} onPress={onPressComments}>
                  <MaterialIcons name="comment" size={20} color={darkMode ? '#fff' : '#222'} />
                  <Text style={{ fontSize:13, color: darkMode ? '#ddd' : '#444', marginLeft:6, fontWeight:'500' }}>{Math.max(0, commentCount)}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={{ flexDirection:'row', alignItems:'center' }} onPress={handleShare}>
                  <MaterialIcons name="share" size={22} color={darkMode ? '#fff' : '#222'} />
                </TouchableOpacity>
              </View>

              {post?.etiquetas && Array.isArray(post.etiquetas) && post.etiquetas.length > 0 && (
                <View style={{ 
                  marginTop: 8, 
                  paddingTop: 8, 
                  borderTopWidth: 1, 
                  borderTopColor: darkMode ? '#333' : '#e5e7eb',
                  width: '100%'
                }}>
                  <Text style={{ 
                    fontSize: 12, 
                    color: darkMode ? '#888' : '#666',
                    marginBottom: 6,
                    fontWeight: '600'
                  }}></Text>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', width:'100%' }}>
                    {post.etiquetas.map((etiqueta, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: darkMode ? '#1e3a8a' : '#dbeafe',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          marginRight: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ 
                          fontSize: 13, 
                          color: darkMode ? '#93c5fd' : '#1e40af',
                          fontWeight: '600'
                        }}>
                          {etiqueta}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* Modal de reporte (similar a FeedItem): chips + descripción opcional, cerrar al tocar fuera */}
      <Modal
        transparent
        animationType="fade"
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', alignItems:'center' }} onPress={() => setReportModalVisible(false)}>
          <Pressable style={{ width:'90%', maxWidth:420, backgroundColor: darkMode ? '#1b1b1b' : '#fff', borderRadius:20, padding:20 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontSize:18, fontWeight:'700', marginBottom:6, color: darkMode ? '#fff' : '#111' }}>Reportar publicación</Text>
            <Text style={{ fontSize:14, color: darkMode ? '#ccc' : '#444', marginBottom:14 }}>Selecciona un motivo y agrega una descripción (opcional):</Text>

            <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:16 }}>
              {['Contenido inapropiado','Spam','Acoso','Información falsa','Otro'].map((motivo) => (
                <TouchableOpacity
                  key={motivo}
                  onPress={() => setReportReason(motivo)}
                  style={{
                    backgroundColor: reportReason === motivo ? (darkMode ? '#2563eb' : '#1d4ed8') : (darkMode ? '#2d2d2d' : '#f1f5f9'),
                    paddingHorizontal:14,
                    paddingVertical:8,
                    borderRadius:18,
                    marginRight:8,
                    marginBottom:8,
                  }}
                >
                  <Text style={{ color: reportReason === motivo ? '#fff' : (darkMode ? '#ddd' : '#333'), fontSize:13, fontWeight:'600' }}>{motivo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={reportText}
              onChangeText={setReportText}
              placeholder="Describe el motivo (opcional)"
              placeholderTextColor={darkMode ? '#777' : '#888'}
              multiline
              style={{
                backgroundColor: darkMode ? '#2a2a2a' : '#f8fafc',
                borderRadius:12,
                padding:12,
                minHeight:80,
                color: darkMode ? '#fff' : '#111',
                textAlignVertical:'top',
                marginBottom:16,
                fontSize:14
              }}
            />

            <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
              <TouchableOpacity
                onPress={() => { setReportModalVisible(false); }}
                style={{ paddingVertical:10, paddingHorizontal:18, borderRadius:14, backgroundColor: darkMode ? '#333' : '#e2e8f0', marginRight:10 }}
              >
                <Text style={{ color: darkMode ? '#fff' : '#111', fontWeight:'600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    // Permitir que el padre maneje el reporte si pasó onPressReport
                    if (onPressReport) {
                      onPressReport(post, reportReason, reportText.trim() || null);
                    } else {
                      const carnet = await AsyncStorage.getItem('carnet');
                      if (!carnet) throw new Error('No se encontró el usuario actual');
                      const payload = {
                        publicacion_id: post.id,
                        carnet_reporta: carnet,
                        carnet_publica: post.userId || null,
                        motivo: reportReason,
                        detalle: reportText.trim() || null,
                        created_at: new Date().toISOString(),
                      };
                      await supabase.from('reportes_publicaciones').insert([payload]);
                    }
                    setReportModalVisible(false);
                    setReportText('');
                    setReportReason('Contenido inapropiado');
                  } catch (err) {
                    // opcional: manejo de error (Toast/Alert)
                  }
                }}
                disabled={!reportReason}
                style={{
                  paddingVertical:10,
                  paddingHorizontal:20,
                  borderRadius:14,
                  backgroundColor: (!reportReason) ? (darkMode ? '#1f2937' : '#94a3b8') : '#dc2626'
                }}
              >
                <Text style={{ color:'#fff', fontWeight:'700' }}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
