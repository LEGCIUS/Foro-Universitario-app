import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import FeedItem from './FeedItem';

export default function FeedList({ posts = [], isScreenFocused = true, closeSignal = 0, refreshing = false, onRefresh }) {
  const { darkMode } = useTheme();
  const [visibleIds, setVisibleIds] = useState(new Set());
  const [scrollToken, setScrollToken] = useState(0);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 75 });

  const onViewableItemsChangedRef = useRef(({ viewableItems }) => {
    const ids = new Set(viewableItems.map(v => v.item.id));
    setVisibleIds(ids);
  });
  const onViewableItemsChanged = onViewableItemsChangedRef.current;

  const MemoFeedItem = useMemo(
    () =>
      React.memo(
        FeedItem,
        (prev, next) => {
          const a = prev.item, b = next.item;
          return (
            a?.id === b?.id &&
            a?.mediaUrl === b?.mediaUrl &&
            a?.mediaType === b?.mediaType &&
            a?.text === b?.text &&
            prev.isVisible === next.isVisible &&
            prev.isScreenFocused === next.isScreenFocused &&
            prev.closeSignal === next.closeSignal
          );
        }
      ),
    []
  );

  const effectiveCloseSignal = closeSignal + scrollToken;
  const renderItem = useCallback(
    ({ item }) => (
      <MemoFeedItem
        item={item}
        isVisible={visibleIds.has(item.id)}
        isScreenFocused={isScreenFocused}
        closeSignal={effectiveCloseSignal}
      />
    ),
    [visibleIds, isScreenFocused, effectiveCloseSignal, MemoFeedItem]
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => (item?.id ? String(item.id) : Math.random().toString())}
      contentContainerStyle={[styles.feed, { paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
      initialNumToRender={4}
      maxToRenderPerBatch={8}
      windowSize={7}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfigRef.current}
      onScrollBeginDrag={() => setScrollToken(t => t + 1)}
      onMomentumScrollBegin={() => setScrollToken(t => t + 1)}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={darkMode ? ['#007AFF'] : ['#007AFF']}
            tintColor={darkMode ? '#007AFF' : '#007AFF'}
            progressBackgroundColor={darkMode ? '#2b2b2b' : '#fff'}
          />
        ) : undefined
      }
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { backgroundColor: darkMode ? '#2b2b2b' : '#eaeaea' }]} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  feed: {
    paddingBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#eaeaea',
    width: '100%',
  },
});
