import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function SplashScreenCustom() {
  return (
    <View style={styles.container}>
      {/* Círculos de fondo */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />
      <View style={[styles.circle, styles.circle4]} />

      {/* Imágenes circulares */}
      <Image source={require('../../assets/avatar1.png')} style={[styles.avatar, styles.avatar1]} />
      <Image source={require('../../assets/avatar2.png')} style={[styles.avatar, styles.avatar2]} />
      <Image source={require('../../assets/avatar3.png')} style={[styles.avatar, styles.avatar3]} />
      <Image source={require('../../assets/avatar4.png')} style={[styles.avatar, styles.avatar4]} />

      {/* Card inferior */}
      <View style={styles.card}> 
        <Text style={styles.cardTitle}>Ready to take your relationship circle to a next level?</Text>
        <Text style={styles.cardDesc}>
          Use our app and explore millions of people from all over the world with all kind of trait.
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <TouchableOpacity style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>Next</Text>
            <Text style={styles.nextBtnArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafbfc',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  // Círculos de fondo
  circle: {
    position: 'absolute',
    opacity: 0.25,
  },
  circle1: {
    width: 180, height: 180, borderRadius: 90, backgroundColor: '#6ee7b7', top: 30, left: -40,
  },
  circle2: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#818cf8', top: 80, right: -30,
  },
  circle3: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: '#fbbf24', top: 180, left: 60,
  },
  circle4: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#f472b6', top: 220, right: 40,
  },
  // Avatares
  avatar: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#eee',
    resizeMode: 'cover',
  },
  avatar1: { top: 60, left: 40 },
  avatar2: { top: 40, right: 40 },
  avatar3: { top: 180, left: 100 },
  avatar4: { top: 170, right: 60 },
  // Card
  card: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 14,
    color: '#888',
    marginBottom: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  dotActive: {
    backgroundColor: '#f43f5e',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextBtnText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 6,
  },
  nextBtnArrow: {
    color: '#222',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
