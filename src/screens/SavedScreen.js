import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Share, View, FlatList, ScrollView, StyleSheet } from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartOff } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { ProviderCardRow } from '../components/ProviderCard';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import CommunityPostCard from '../components/community/PostCard';
import { resolveCommunityImages } from '../data/communityImages';
import { supabase } from '../lib/supabase';

export default function SavedScreen({ navigation }) {
  const { providers, savedIds, toggleSaved, session } = useAppState();
  const { palette, communityPalette } = useChodhiQTheme();
  const [tab, setTab] = useState('businesses');
  const [savedPosts, setSavedPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const savedProviders = useMemo(() => {
    const saved = new Set(savedIds);
    return providers.filter((provider) => saved.has(provider.id));
  }, [providers, savedIds]);

  const loadSavedPosts = useCallback(async () => {
    if (!session?.user?.id || !supabase) {
      setSavedPosts([]);
      setPostsError('Sign in to view saved community posts.');
      return;
    }
    setPostsLoading(true);
    setPostsError('');
    try {
      const { data: savedRows, error: savesError } = await supabase
        .from('community_saved_posts')
        .select('post_id,created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (savesError) throw savesError;
      const postIds = (savedRows || []).map((row) => row.post_id).filter(Boolean);
      if (!postIds.length) {
        setSavedPosts([]);
        return;
      }
      const { data, error } = await supabase
        .from('community_posts')
        .select(
          'id,author_id,provider_id,post_type,body,image_url,offer_expires_at,region_key,location_city,created_at,providers(id,business_name,is_verified,categories(name,slug))',
        )
        .in('id', postIds)
        .eq('status', 'published');
      if (error) throw error;
      const order = new Map(postIds.map((id, index) => [id, index]));
      const posts = (data || []).sort((left, right) => order.get(left.id) - order.get(right.id));
      const authors = [...new Set(posts.map((post) => post.author_id).filter(Boolean))];
      const names = await Promise.all(
        authors.map(async (authorId) => {
          try {
            const { data: profile } = await supabase.rpc('get_community_member_profile', {
              target_author: authorId,
            });
            const row = Array.isArray(profile) ? profile[0] : profile;
            return [authorId, row?.display_name || null];
          } catch {
            return [authorId, null];
          }
        }),
      );
      const authorNames = new Map(names);
      const resolved = await resolveCommunityImages(
        posts.map((post) => ({
          ...post,
          author_name: authorNames.get(post.author_id) || 'Community member',
        })),
      );
      setSavedPosts(resolved);
    } catch {
      setPostsError('Saved posts could not load. Check your connection and retry.');
    } finally {
      setPostsLoading(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (tab === 'posts') void loadSavedPosts();
    }, [loadSavedPosts, tab]),
  );

  const removeSavedPost = useCallback(
    async (postId) => {
      if (!session?.user?.id || !supabase) return;
      const previous = savedPosts;
      setSavedPosts((current) => current.filter((post) => post.id !== postId));
      const { error } = await supabase
        .from('community_saved_posts')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', session.user.id);
      if (error) {
        setSavedPosts(previous);
        setPostsError('Could not remove the saved post. Please try again.');
      }
    },
    [savedPosts, session?.user?.id],
  );

  const renderSavedPost = useCallback(
    ({ item: post }) => (
      <CommunityPostCard
        post={post}
        palette={communityPalette}
        providers={providers}
        session={session}
        engagement={{ counts: {}, saves: [{ post_id: post.id }] }}
        onLike={() => {}}
        onComment={() => navigation.navigate('CommunityTab', { postId: post.id })}
        onSave={() => removeSavedPost(post.id)}
        onShare={() => Share.share({ message: post.body || 'A post saved on ChodhiQ' })}
        onAuthor={() =>
          post.author_id && navigation.navigate('CommunityProfile', { authorId: post.author_id })
        }
        onProvider={() =>
          post.provider_id && navigation.navigate('ProviderDetail', { id: post.provider_id })
        }
      />
    ),
    [communityPalette, navigation, providers, removeSavedPost, session],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: palette.text }]}>Saved</Text>
        <Text style={[typography.caption, { color: palette.text2 }]}>
          Your saved businesses and posts
        </Text>
      </View>
      <View style={styles.tabsFrame}>
        <ScrollView
          style={{ flexGrow: 0, flexShrink: 0 }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabs, { backgroundColor: palette.surfaceAlt }]}
        >
          {['businesses', 'events', 'offers', 'posts'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.tab,
                tab === item && styles.tabActive,
                tab === item && { backgroundColor: palette.primary },
              ]}
              onPress={() => setTab(item)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tab === item ? palette.background : palette.text2 },
                ]}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={tab === 'businesses' ? savedProviders : tab === 'posts' ? savedPosts : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={
          tab === 'posts'
            ? renderSavedPost
            : ({ item: provider }) => (
                <ProviderCardRow
                  provider={provider}
                  saved
                  onSave={() => toggleSaved(provider.id)}
                  onPress={() => navigation.navigate('ProviderDetail', { id: provider.id })}
                />
              )
        }
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={false}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          tab === 'posts' && postsLoading ? (
            <ActivityIndicator style={styles.loading} color={palette.primary} />
          ) : tab === 'posts' && postsError ? (
            <TouchableOpacity onPress={loadSavedPosts} style={styles.empty}>
              <Text style={[styles.emptyText, { color: palette.text2 }]}>{postsError}</Text>
              <Text style={{ color: palette.primary, fontWeight: '800' }}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.empty}>
              <HeartOff size={32} color={palette.muted} />
              <Text style={[styles.emptyText, { color: palette.text2 }]}>
                {tab === 'businesses'
                  ? 'Nothing saved yet. Tap the heart on any provider to save it here.'
                  : `Saved ${tab} will appear here as you bookmark them.`}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tabsFrame: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tabs: {
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  tabActive: { ...shadows.soft },
  tabText: { fontSize: 11, fontWeight: '800' },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  loading: { marginTop: spacing.xl },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
});
