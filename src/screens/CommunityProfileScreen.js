import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import ScreenHeader from '../components/ScreenHeader';
import { FadeInView } from '../components/Motion';
import { useChodhiQTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { resolveCommunityImages } from '../data/communityImages';
import { formatDate } from '../lib/dateTime';
import { imageSource } from '../data/assetCatalog';
import GlowButton from '../../components/ui/GlowButton';
import { GlowListItem, GlowProfileCard } from '../../components/ui/GlowSurfaces';
export default function CommunityProfileScreen({ navigation, route }) {
  const { palette } = useChodhiQTheme();
  const authorId = route.params?.authorId;
  const [member, setMember] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      if (!supabase || !authorId) throw new Error('unavailable');
      const identity = await supabase.rpc('get_community_member_profile', {
        target_author: authorId,
      });
      if (identity.error) throw identity.error;
      const person = identity.data?.[0];
      if (!person) {
        if (request === requestId.current) {
          setMember(null);
          setPosts([]);
        }
        return;
      }
      const result = await supabase
        .from('community_posts')
        .select('id,body,image_url,created_at,post_type')
        .eq('author_id', authorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(page * 20, page * 20 + 19);
      if (result.error) throw result.error;
      const resolved = await resolveCommunityImages(result.data || []);
      if (request !== requestId.current) return;
      setMember(person);
      setPosts(resolved);
      setMore((result.data || []).length === 20);
    } catch {
      if (request === requestId.current)
        setError('This community profile could not be loaded. Check your connection and retry.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [authorId, page]);
  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader navigation={navigation} title="Community profile" />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.primary} />
        ) : error ? (
          <View>
            <Text style={{ color: palette.text }}>{error}</Text>
            <GlowButton
              variant="primary"
              label="Retry"
              onPress={() => {
                void load();
              }}
              buttonStyle={styles.retryButton}
            />
          </View>
        ) : !member ? (
          <Text style={{ color: palette.text2 }}>
            This profile is unavailable or has no posts visible to you.
          </Text>
        ) : (
          <>
            <FadeInView>
              <GlowProfileCard
                contentStyle={styles.cardContent}
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                {member.avatar_url ? (
                  <Image source={imageSource(member.avatar_url)} style={styles.avatar} />
                ) : (
                  <Text style={{ color: palette.primary, fontSize: 30, fontWeight: '700' }}>
                    {member.display_name?.[0] || 'C'}
                  </Text>
                )}
                <Text style={{ color: palette.text, fontSize: 22, fontWeight: '700' }}>
                  {member.display_name}
                </Text>
                {!!member.joined_year && (
                  <Text style={{ color: palette.text2 }}>
                    Community member since {member.joined_year}
                  </Text>
                )}
              </GlowProfileCard>
            </FadeInView>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 18 }}>
              Community posts
            </Text>
            {!posts.length && (
              <Text style={{ color: palette.text2 }}>No posts visible to you.</Text>
            )}
            {posts.map((post, index) => (
              <FadeInView key={post.id} delay={index * 45}>
                <GlowListItem
                  contentStyle={styles.postContent}
                  style={[
                    styles.card,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                >
                  <Text style={{ color: palette.text2 }}>{formatDate(post.created_at)}</Text>
                  <Text style={{ color: palette.text, lineHeight: 24 }}>{post.body}</Text>
                  {post.image_url && (
                    <Image
                      source={imageSource(post.image_url)}
                      resizeMode="contain"
                      style={{ width: '100%', height: 250 }}
                    />
                  )}
                </GlowListItem>
              </FadeInView>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <GlowButton
                variant="secondary"
                label="Previous"
                disabled={!page}
                onPress={() => setPage((value) => value - 1)}
              />
              <GlowButton
                variant="secondary"
                label="Next"
                disabled={!more}
                onPress={() => setPage((value) => value + 1)}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, gap: 18, paddingBottom: 40 },
  card: { borderRadius: 18, marginBottom: 0 },
  cardContent: { padding: 18, gap: 12, alignItems: 'center' },
  postContent: { padding: 16, gap: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  retryButton: { minWidth: 120, marginTop: 14 },
});
