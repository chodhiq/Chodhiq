import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Share, View, FlatList, StyleSheet } from 'react-native';
import { AppAlert as Alert } from '../components/AppDialog';
import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, Building2, HeartOff } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme/theme';
import { ProviderCardRow } from '../components/ProviderCard';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import CommunityPostCard from '../components/community/PostCard';
import { resolveCommunityImages } from '../data/communityImages';
import { supabase } from '../lib/supabase';
import { FadeInView } from '../components/Motion';
import TabPills from '../../components/TabPills';
import GlowButton from '../../components/ui/GlowButton';
import { getTabBarContentPadding } from '../navigation/tabBarLayout';

export default function SavedScreen({ navigation }) {
  const { providers, savedIds, toggleSaved, session } = useAppState();
  const { palette, communityPalette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('businesses');
  const savedTabs = ['businesses', 'posts'];
  const [savedPosts, setSavedPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const removalRequests = useRef(new Set());
  const savedProviders = useMemo(() => {
    const saved = new Set(savedIds.map(String));
    return providers.filter((provider) => saved.has(String(provider.id)));
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
      if (removalRequests.current.has(postId)) return;
      removalRequests.current.add(postId);
      try {
        const { error } = await supabase
          .from('community_saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id);
        if (error) throw error;
        setSavedPosts((current) => current.filter((post) => post.id !== postId));
        setPostsError('');
      } catch (error) {
        console.warn('Unable to remove saved community post.', error);
        setPostsError('Could not remove the saved post. Please try again.');
      } finally {
        removalRequests.current.delete(postId);
      }
    },
    [session?.user?.id],
  );

  const renderSavedPost = useCallback(
    ({ item: post, index }) => (
      <FadeInView delay={Math.min(index * 45, 320)}>
        <CommunityPostCard
          post={post}
          palette={communityPalette}
          providers={providers}
          session={session}
          engagement={{ counts: {}, saves: [{ post_id: post.id }] }}
          onComment={() => navigation.navigate('CommunityTab', { postId: post.id })}
          onSave={() => removeSavedPost(post.id)}
          onShare={async () => {
            try {
              await Share.share({ message: post.body || 'A post saved on ChodhiQ' });
            } catch (error) {
              console.warn('Unable to share saved community post.', error);
              Alert.alert('Could not share post', 'Please try sharing this post again.');
            }
          }}
          onAuthor={() =>
            post.author_id && navigation.navigate('CommunityProfile', { authorId: post.author_id })
          }
          onProvider={() =>
            post.provider_id && navigation.navigate('ProviderDetail', { id: post.provider_id })
          }
        />
      </FadeInView>
    ),
    [communityPalette, navigation, providers, removeSavedPost, session],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: palette.text }]}>Saved</Text>
        <Text style={[typography.caption, { color: palette.text2 }]}>
          Your saved businesses and posts
        </Text>
      </View>
      <View style={styles.tabsFrame}>
        <TabPills
          tabs={[
            { id: 'businesses', label: 'Businesses', Icon: Building2 },
            { id: 'posts', label: 'Posts', Icon: Bookmark },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <FlatList
        data={tab === 'businesses' ? savedProviders : tab === 'posts' ? savedPosts : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={
          tab === 'posts'
            ? renderSavedPost
            : ({ item: provider, index }) => (
                <ProviderCardRow
                  provider={provider}
                  index={index}
                  saved
                  onSave={() =>
                    session ? toggleSaved(provider.id) : navigation.navigate('Welcome')
                  }
                  onPress={() => navigation.navigate('ProviderDetail', { id: provider.id })}
                />
              )
        }
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getTabBarContentPadding(insets.bottom) },
        ]}
        ListEmptyComponent={
          tab === 'posts' && postsLoading ? (
            <ActivityIndicator style={styles.loading} color={palette.primary} />
          ) : tab === 'posts' && !session?.user?.id ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: palette.text2 }]}>
                Sign in to see saved posts
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => navigation.navigate('Welcome')}
                style={styles.signInButton}
              >
                <Text style={{ color: palette.primary, fontWeight: '800' }}>Sign in</Text>
              </TouchableOpacity>
            </View>
          ) : tab === 'posts' && postsError ? (
            <TouchableOpacity onPress={loadSavedPosts} style={styles.empty}>
              <Text style={[styles.emptyText, { color: palette.text2 }]}>{postsError}</Text>
              <Text style={{ color: palette.primary, fontWeight: '800' }}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <HeartOff size={32} color={palette.muted} />
              <Text style={[styles.emptyText, { color: palette.text2 }]}>
                {tab === 'businesses'
                  ? 'Nothing saved yet. Tap the heart on any provider to save it here.'
                  : `Saved ${tab} will appear here as you bookmark them.`}
              </Text>
              {tab === 'businesses' ? (
                <GlowButton
                  label="Browse businesses"
                  variant="ghost"
                  onPress={() => navigation.navigate('Explore')}
                />
              ) : null}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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
  emptyCard: {
    marginTop: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderTopWidth: 0,
    borderRadius: 18,
    padding: spacing.xl,
    gap: spacing.md,
  },
  loading: { marginTop: spacing.xl },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
  signInButton: { padding: spacing.sm },
});
