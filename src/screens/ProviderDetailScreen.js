import ScrollView from '../components/KeyboardAwareScrollView';
import { AppAlert as Alert } from '../components/AppDialog';
import { MotionModal as Modal } from '../components/Motion';
import { MotionTouchable } from '../components/Motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as IntentLauncher from 'expo-intent-launcher';

import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateHttpsUrl } from '../lib/validation';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Flag,
  Globe,
  Image as ImageIcon,
  Info,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  X,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import GlowCard from '../../components/GlowCard';
import GlowIconButton from '../../components/ui/GlowIconButton';
import TabPills from '../../components/TabPills';
import { theme } from '../../theme';
import useEffectsLevel from '../hooks/useEffectsLevel';
import useReducedMotion from '../hooks/useMotionPreferences';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import {
  EmptyBlock,
  PhotoGallery,
  ProviderHero,
  ProviderIdentity,
  ProviderMapPreview,
  ProviderVerified,
  ReviewCard,
  ReviewSummary,
} from '../components/ProviderDetailComponents';
import {
  getUkFutureDate,
  getUkLocalDateTime,
  requiresLateNightBookingConfirmation,
  validateBookingDateTime,
} from '../data/bookingValidation';
import { formatBookingTime, formatDate } from '../lib/dateTime';
import { loadConfirmedBookingTimes } from '../data/bookingRepository';
import { toWhatsAppNumber } from '../lib/phone';
import { captureError } from '../lib/sentryUtils';
import { openExternalUrl } from '../lib/openExternalUrl';
import { isPlaceholderImage } from '../data/assetCatalog';
import { findUserReview, summarizeReviews } from '../lib/reviewStats';
import AsyncGlowButton from '../../components/ui/AsyncGlowButton';
import GlowButton from '../../components/ui/GlowButton';
import GlassView from '../components/GlassView';

function bookingFailureMessage(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || error || '');
  if (/23503/.test(code))
    return 'The selected provider or service is no longer available. Refresh the listing and try again.';
  if (/23P01|23505/.test(code) || /already booked|slot.*taken/i.test(message))
    return 'This time is already booked. Choose a different date or time.';
  if (code === '42501' || [401, 403].includes(Number(error?.status)))
    return 'Your session may have expired. Sign in again, then try your booking.';
  if (/choose (a date|a valid booking|a future|a time)|booking time/i.test(message)) return message;
  if (/network|fetch failed|offline|timed out|timeout/i.test(message))
    return 'We could not reach the booking service. Check your connection and try again.';
  return 'We could not send your booking request. Please try again. If it keeps failing, contact support.';
}

const futureDate = (days) => getUkFutureDate(days);
const priceLabel = (value) => (value ? '£'.repeat(value) : null);
const parseLocalDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};
const parseLocalDateTime = (dateValue, timeValue) => {
  const value = parseLocalDate(dateValue);
  const match = /^(\d{2}):(\d{2})$/.exec(timeValue || '');
  if (match) value.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return value;
};
const formatLocalDate = (value) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const formatLocalTime = (value) =>
  `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
const reviewStyles = StyleSheet.create({
  form: { borderWidth: 1, borderRadius: 17, padding: 15, marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  rating: { flexDirection: 'row', gap: 8, marginTop: 14 },
  ratingStarButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    marginTop: 14,
    textAlignVertical: 'top',
  },
  count: { fontSize: 10, textAlign: 'right', marginVertical: 5 },
  signIn: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 14 },
});
const providerSectionTabs = [
  { id: 'about', label: 'About', Icon: Info },
  { id: 'services', label: 'Services', Icon: Briefcase },
  { id: 'reviews', label: 'Reviews', Icon: Star },
  { id: 'photos', label: 'Photos', Icon: ImageIcon },
];
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function AnimatedSection({ index, canAnimate, canPressAnimate, children }) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onTouchStart = () => {
    // Reanimated shared values are updated from native touch callbacks.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = canPressAnimate ? withSpring(0.985, { damping: 16, stiffness: 280 }) : 1;
  };
  const onTouchEnd = () => {
    // Reanimated shared values are updated from native touch callbacks.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = 1;
  };
  return (
    <Animated.View
      entering={canAnimate ? FadeInDown.delay(index * 80).duration(280) : undefined}
      style={scaleStyle}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {children}
    </Animated.View>
  );
}

export default function ProviderDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const {
    providers,
    savedIds,
    toggleSaved,
    addQuoteRequest,
    addBooking,
    reportProvider,
    recordProviderView,
    reviews,
    reviewsLoading,
    reviewsError,
    marketplaceLoading,
    refreshMarketplace,
    addReview,
    editReview,
    session,
  } = useAppState();
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const effectsLevel = useEffectsLevel();
  const reducedMotion = useReducedMotion();
  const canAnimate = effectsLevel === 'full' && !reducedMotion;
  const canPressAnimate = effectsLevel !== 'off' && !reducedMotion;
  const provider = providers.find((item) => item.id === id);
  const isPlace = provider?.listingType === 'place';
  const saved = provider ? savedIds.includes(String(provider.id)) : false;
  const [sectionTab, setSectionTab] = useState('about');
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(futureDate(1));
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingButtonStatus, setBookingButtonStatus] = useState('idle');
  const [bookingPicker, setBookingPicker] = useState(null);
  const [bookingValidationError, setBookingValidationError] = useState('');
  const [lateNightConfirmationKey, setLateNightConfirmationKey] = useState(null);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);
  const quoteSheetRef = useRef(null);
  const scrollOffset = useSharedValue(0);
  const detailScrollRef = useRef(null);
  const sectionPositions = useRef({});
  const quoteSnapPoints = useMemo(() => ['48%', '84%'], []);
  const handleDetailScroll = useCallback(
    (event) => {
      const offset = event.nativeEvent.contentOffset.y;
      // Reanimated values are intentionally updated from this native scroll callback.
      // eslint-disable-next-line react-hooks/immutability
      scrollOffset.value = offset;
      const visibleSections = providerSectionTabs.filter(
        (section) => sectionPositions.current[section.id] <= offset + 140,
      );
      if (visibleSections.length) setSectionTab(visibleSections[visibleSections.length - 1].id);
    },
    [scrollOffset],
  );
  const rememberSection = useCallback(
    (section) => (event) => {
      sectionPositions.current[section] = event.nativeEvent.layout.y;
    },
    [],
  );
  const scrollToSection = useCallback((section) => {
    setSectionTab(section);
    const position = sectionPositions.current[section];
    if (Number.isFinite(position))
      detailScrollRef.current?.scrollTo({ y: Math.max(0, position - 110), animated: true });
  }, []);
  const renderBackdrop = useCallback(
    (props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
    [],
  );
  useEffect(() => {
    if (provider) recordProviderView(id);
  }, [id, provider, recordProviderView]);
  useEffect(() => {
    if (isPlace || !bookingOpen || !provider || !bookingDate) return undefined;
    let active = true;
    setBookedTimes([]);
    setAvailabilityLoading(true);
    setAvailabilityError(false);
    loadConfirmedBookingTimes(provider.id, bookingDate)
      .then((times) => {
        if (active) setBookedTimes(times);
      })
      .catch(() => {
        if (active) setAvailabilityError(true);
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingOpen, bookingDate, isPlace, provider?.id]);
  useEffect(() => {
    if (bookingButtonStatus === 'idle' || bookingButtonStatus === 'loading') return undefined;
    const timer = setTimeout(() => setBookingButtonStatus('idle'), 1600);
    return () => clearTimeout(timer);
  }, [bookingButtonStatus]);
  if (!provider)
    return (
      <SafeAreaView style={[styles.error, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.errorTitle, { color: palette.text }]}>
          Unable to load this business.
        </Text>
        <MotionTouchable
          style={[styles.primary, { backgroundColor: palette.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text
            style={{
              color: palette.dark ? theme.colors.onPrimary : theme.colors.textPrimary,
              fontWeight: '800',
            }}
          >
            Go back
          </Text>
        </MotionTouchable>
      </SafeAreaView>
    );

  const providerReviews = (reviews || []).filter(
    (review) => String(review.providerId) === String(provider.id),
  );
  const reviewStats = summarizeReviews(providerReviews);
  const currentUserReview = findUserReview(providerReviews, provider.id, session?.user?.id);
  const selectedTimeBooked = Boolean(bookingTime && bookedTimes.includes(bookingTime));
  const isRestaurant = /restaurant|food|cater|bakery|grocery/i.test(provider.category || '');
  const hasMapCoordinates =
    Number.isFinite(provider.baseLatitude) &&
    Number.isFinite(provider.baseLongitude) &&
    Math.abs(provider.baseLatitude) <= 90 &&
    Math.abs(provider.baseLongitude) <= 180;
  const phoneNumber = toWhatsAppNumber(provider.phone);
  const whatsappNumber = toWhatsAppNumber(provider.whatsapp || provider.phone);
  const preciseDirectionsUrl = hasMapCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${provider.baseLatitude},${provider.baseLongitude}`)}`
    : null;
  const directionsUrl = preciseDirectionsUrl;
  const shareProvider = async () => {
    try {
      await Share.share({
        message: `${provider.name} — ${provider.category} in ${provider.baseCity}. Find them on ChodhiQ.${provider.website ? ` ${provider.website}` : ''}`,
      });
    } catch (error) {
      console.warn('Unable to share provider.', error);
      Alert.alert('Could not share provider', 'Please try sharing this business again.');
    }
  };
  const saveProvider = async () => {
    try {
      await toggleSaved(provider.id);
    } catch (error) {
      Alert.alert('Sign in required', error.message, [
        { text: 'Cancel' },
        { text: 'Sign in', onPress: () => navigation.navigate('Welcome') },
      ]);
    }
  };
  const sendQuote = async () => {
    if (isPlace) return;
    if (!session) {
      Alert.alert('Sign in required', 'Please sign in before requesting a quote.', [
        { text: 'Cancel' },
        { text: 'Sign in', onPress: () => navigation.navigate('Welcome') },
      ]);
      return;
    }
    const number = whatsappNumber;
    if (!number)
      return Alert.alert('Contact unavailable', 'This business has no valid WhatsApp number.');
    const message =
      quoteMessage || `Hi ${provider.name}, I found you on ChodhiQ and I'd like a quote.`;
    setQuoteBusy(true);
    try {
      const opened = await openExternalUrl(
        `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
        {
          title: 'WhatsApp could not be opened',
          fallbackMessage: 'Open WhatsApp or try again later.',
        },
      );
      if (!opened) return;
      const result = await addQuoteRequest({
        providerId: provider.id,
        providerName: provider.name,
        message,
      });
      Alert.alert(
        result?.syncStatus === 'pending' ? 'Quote request pending' : 'Quote request sent',
        result?.syncStatus === 'pending'
          ? 'Saved on your phone, will send when you’re online'
          : 'Sent',
      );
      quoteSheetRef.current?.dismiss();
    } catch (error) {
      Alert.alert(
        'WhatsApp opened',
        `We can't confirm delivery. Check your WhatsApp chat. This request could not be saved in ChodhiQ: ${error.message || 'Please try again.'}`,
      );
      throw error;
    } finally {
      setQuoteBusy(false);
    }
  };
  const submitReport = async () => {
    if (!reportDetails.trim()) return;
    try {
      const result = await reportProvider(
        provider.id,
        'incorrect_information',
        reportDetails.trim(),
      );
      setReportOpen(false);
      setReportDetails('');
      Alert.alert(
        result?.status === 'pending' ? 'Report pending' : 'Report submitted',
        result?.status === 'pending'
          ? 'Saved on your phone, will send when you’re online'
          : 'Your report was sent.',
      );
    } catch (error) {
      Alert.alert('Could not submit report', error.message);
    }
  };
  const submitReview = async () => {
    setReviewBusy(true);
    try {
      let reviewResult;
      if (editingReviewId) {
        await editReview(editingReviewId, { rating: reviewRating, comment: reviewComment });
      } else {
        reviewResult = await addReview({
          providerId: provider.id,
          rating: reviewRating,
          comment: reviewComment,
        });
      }
      setReviewRating(0);
      setReviewComment('');
      setEditingReviewId(null);

      Alert.alert(
        editingReviewId ? 'Review updated' : 'Review published',
        !editingReviewId && reviewResult?.syncStatus === 'pending'
          ? 'Saved on your phone, will send when you’re online'
          : 'Your review was sent.',
      );
    } catch (error) {
      Alert.alert('Could not publish review', error.message);
    } finally {
      setReviewBusy(false);
    }
  };
  const submitBooking = async () => {
    if (isPlace) return;
    try {
      validateBookingDateTime(bookingDate, bookingTime, new Date(), provider.openingHours);
    } catch (error) {
      setBookingValidationError(error.message);
      setLateNightConfirmationKey(null);
      return;
    }
    const confirmationKey = `${bookingDate}T${bookingTime}`;
    if (
      requiresLateNightBookingConfirmation(bookingTime, provider.openingHours) &&
      lateNightConfirmationKey !== confirmationKey
    ) {
      setBookingValidationError('');
      setLateNightConfirmationKey(confirmationKey);
      return;
    }
    setBookingBusy(true);
    setBookingButtonStatus('loading');
    setBookingValidationError('');
    try {
      await addBooking({
        providerId: provider.id,
        serviceId: selectedService,
        requestedDate: bookingDate,
        requestedTime: bookingTime,
        notes: bookingNotes,
      });
      setBookingOpen(false);
      setBookingDate('');
      setBookingTime('');
      setBookingNotes('');
      setSelectedService(null);
      setLateNightConfirmationKey(null);
      setBookingButtonStatus('success');

      Alert.alert('Booking requested', `${provider.name} will confirm or suggest another time.`);
    } catch (error) {
      setBookingButtonStatus('error');
      setBookingValidationError(bookingFailureMessage(error));
      if (!/^Choose (a date|a valid booking|a future)/i.test(String(error?.message || '')))
        captureError(error, { operation: 'createBooking' });
      Alert.alert('Could not request booking', bookingFailureMessage(error));
    } finally {
      setBookingBusy(false);
    }
  };
  const updateBookingDate = (value) => {
    setBookingDate(value);
    setBookingValidationError('');
    setLateNightConfirmationKey(null);
  };
  const updateBookingTime = (value) => {
    setBookingTime(value);
    setBookingValidationError('');
    setLateNightConfirmationKey(null);
  };
  const onBookingPickerChange = (event, selected) => {
    if (event.type === 'dismissed') {
      setBookingPicker(null);
      return;
    }
    if (selected) {
      if (bookingPicker === 'date') {
        updateBookingDate(formatLocalDate(selected));
      } else {
        updateBookingTime(formatLocalTime(selected));
      }
    }
    if (Platform.OS !== 'ios' || event.type === 'set') setBookingPicker(null);
  };
  const quickActions = [
    {
      label: 'Call',
      icon: Phone,
      available: Boolean(phoneNumber),
      onPress: async () => {
        const url = `tel:+${phoneNumber}`;
        if (Platform.OS !== 'android') {
          await openExternalUrl(url, {
            title: 'Phone unavailable',
            fallbackMessage: 'No phone app is available. You can copy the business number instead.',
          });
          return;
        }
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.DIAL', { data: url });
        } catch (error) {
          console.warn('Unable to open the phone dialer.', error);
          Alert.alert('Phone unavailable', 'No phone dialer is available for this device.');
        }
      },
    },
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      available: Boolean(whatsappNumber),
      onPress: () =>
        openExternalUrl(`https://wa.me/${whatsappNumber}`, {
          title: 'WhatsApp unavailable',
          fallbackMessage: 'Open WhatsApp or try again later.',
        }),
    },
    {
      label: 'Directions',
      icon: Navigation,
      available: hasMapCoordinates,
      onPress: () =>
        openExternalUrl(directionsUrl, {
          title: 'Directions unavailable',
          fallbackMessage: 'Directions could not be opened. Try again later.',
        }),
    },
    {
      label: 'Website',
      icon: Globe,
      available: Boolean(provider.website),
      onPress: async () => {
        let websiteUrl;
        try {
          websiteUrl = validateHttpsUrl(provider.website);
        } catch {
          Alert.alert('Website unavailable', 'This provider website is not a valid secure URL.');
          return;
        }
        await openExternalUrl(websiteUrl, {
          title: 'Website unavailable',
          fallbackMessage: 'This provider website could not be opened. Try again later.',
        });
      },
    },
  ].filter((action) => action.available);
  const photos = provider.portfolio || [];
  const reviewForm = (!currentUserReview || editingReviewId) && (
    <View
      style={[reviewStyles.form, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <Text style={[reviewStyles.title, { color: palette.text }]}>
        {editingReviewId ? 'Edit your review' : 'Leave a review'}
      </Text>
      <Text style={{ color: palette.text2 }}>
        Share a short, honest account of your experience.
      </Text>
      <View style={reviewStyles.rating}>
        {[1, 2, 3, 4, 5].map((value) => (
          <MotionTouchable
            accessibilityRole="button"
            key={value}
            accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
            onPress={() => setReviewRating(value)}
            style={reviewStyles.ratingStarButton}
          >
            <Star
              size={30}
              color={palette.saffron}
              fill={value <= reviewRating ? palette.saffron : 'transparent'}
            />
          </MotionTouchable>
        ))}
      </View>
      <AppTextInput
        maxLength={500}
        multiline
        value={reviewComment}
        onChangeText={setReviewComment}
        placeholder="What was your experience like?"
        placeholderTextColor={palette.muted}
        style={[
          reviewStyles.input,
          { color: palette.text, borderColor: palette.border, backgroundColor: palette.background },
        ]}
      />
      <Text style={[reviewStyles.count, { color: palette.muted }]}>{reviewComment.length}/500</Text>
      <MotionTouchable
        disabled={reviewBusy || !reviewRating || !reviewComment.trim()}
        onPress={submitReview}
        style={[
          styles.primary,
          { backgroundColor: palette.primary },
          (reviewBusy || !reviewRating || !reviewComment.trim()) && {
            backgroundColor: palette.surfaceRaised,
            borderColor: palette.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text
          style={{
            color:
              reviewBusy || !reviewRating || !reviewComment.trim()
                ? palette.text
                : palette.dark
                  ? theme.colors.onPrimary
                  : theme.colors.textPrimary,
            fontWeight: '800',
          }}
        >
          {reviewBusy ? 'Saving…' : editingReviewId ? 'Save changes' : 'Publish review'}
        </Text>
      </MotionTouchable>
      {editingReviewId && (
        <MotionTouchable
          accessibilityRole="button"
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          onPress={() => {
            setEditingReviewId(null);
            setReviewRating(0);
            setReviewComment('');
          }}
          style={{ paddingTop: 11 }}
        >
          <Text style={{ color: palette.text2, textAlign: 'center' }}>Cancel edit</Text>
        </MotionTouchable>
      )}
    </View>
  );
  const openingHours = Array.isArray(provider.openingHours) ? provider.openingHours : [];
  const ukToday = new Date(`${getUkLocalDateTime().date}T00:00:00Z`).getUTCDay();
  const galleryPhotos = photos.filter((url) => typeof url === 'string' && !isPlaceholderImage(url));
  const businessFacts = [
    provider.priceRange && `Price range · ${priceLabel(provider.priceRange)}`,
    provider.languages?.length && `Languages · ${provider.languages.join(', ')}`,
    provider.serviceAreas?.length && `Service area · ${provider.serviceAreas.join(', ')}`,
  ].filter(Boolean);

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: 'transparent' }]} edges={['top']}>
      <ScrollView
        ref={detailScrollRef}
        onScroll={handleDetailScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={[3]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.detailContent,
          { paddingBottom: isPlace ? 24 : 76 + insets.bottom },
        ]}
      >
        <ProviderHero
          provider={provider}
          saved={saved}
          onBack={() => navigation.goBack()}
          onShare={shareProvider}
          onSave={saveProvider}
          scrollOffset={scrollOffset}
        />
        <ProviderIdentity provider={provider} reviews={providerReviews} />
        <View style={styles.body}>
          {quickActions.length > 0 && (
            <View style={styles.quickActions}>
              {quickActions.map(({ label, icon: Icon, onPress }) => (
                <View key={label} style={styles.quickAction}>
                  <GlowIconButton
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    icon={<Icon size={20} color={theme.colors.primary} />}
                    size={48}
                    variant="secondary"
                    onPress={onPress}
                  />
                  <Text style={[styles.quickActionLabel, { color: theme.colors.textSecondary }]}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {provider.isVerified && <ProviderVerified palette={palette} />}
        </View>
        <View style={styles.stickyTabs}>
          <TabPills tabs={providerSectionTabs} value={sectionTab} onChange={scrollToSection} />
        </View>
        <View onLayout={rememberSection('about')} style={styles.sectionWrap}>
          <AnimatedSection index={0} canAnimate={canAnimate} canPressAnimate={canPressAnimate}>
            <GlowCard contentStyle={styles.sectionContent}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text numberOfLines={aboutExpanded ? undefined : 4} style={styles.sectionBody}>
                {provider.description?.trim() || 'This business has not added a description yet.'}
              </Text>
              {provider.description?.trim() && provider.description.length > 180 ? (
                <MotionTouchable
                  accessibilityRole="button"
                  accessibilityLabel={
                    aboutExpanded
                      ? 'Show less about this business'
                      : 'Read more about this business'
                  }
                  onPress={() => setAboutExpanded((expanded) => !expanded)}
                  style={styles.readMoreButton}
                >
                  <Text style={styles.readMoreText}>
                    {aboutExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </MotionTouchable>
              ) : null}
              {businessFacts.length > 0 && (
                <View style={styles.businessFacts}>
                  {businessFacts.map((fact) => (
                    <View key={fact} style={styles.businessFact}>
                      <Text style={styles.businessFactText}>{fact}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Opening hours</Text>
                {openingHours.length ? (
                  [...openingHours]
                    .sort((left, right) => Number(left.day_of_week) - Number(right.day_of_week))
                    .map((hours) => {
                      const day = Number(hours.day_of_week);
                      const isToday = day === ukToday;
                      const schedule = hours.is_closed
                        ? 'Closed'
                        : `${String(hours.open_time || '').slice(0, 5)}–${String(hours.close_time || '').slice(0, 5)}`;
                      return (
                        <View
                          key={hours.day_of_week}
                          style={[styles.hoursRow, isToday && styles.hoursToday]}
                        >
                          <Text style={[styles.hoursDay, isToday && styles.hoursTodayText]}>
                            {weekDays[day] || 'Day'}
                            {isToday ? ' · Today' : ''}
                          </Text>
                          <Text style={[styles.hoursTime, isToday && styles.hoursTodayText]}>
                            {schedule}
                          </Text>
                        </View>
                      );
                    })
                ) : (
                  <Text style={styles.mutedText}>Opening hours have not been added.</Text>
                )}
              </View>
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Find us</Text>
                <ProviderMapPreview
                  provider={provider}
                  palette={palette}
                  location={[provider.baseCity, provider.basePostcode].filter(Boolean).join(' · ')}
                  onPress={hasMapCoordinates ? () => navigation.navigate('Map') : undefined}
                />
              </View>
            </GlowCard>
          </AnimatedSection>
        </View>
        <View onLayout={rememberSection('services')} style={styles.sectionWrap}>
          <AnimatedSection index={1} canAnimate={canAnimate} canPressAnimate={canPressAnimate}>
            <GlowCard contentStyle={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Services</Text>
              {provider.services?.length ? (
                <View style={styles.serviceChips}>
                  {provider.services.map((service) => (
                    <View key={service.id} style={styles.serviceChip}>
                      <Text style={styles.serviceName}>{service.name} service</Text>
                      <Text style={styles.serviceDescription}>
                        {service.starting_price
                          ? `From £${service.starting_price}`
                          : service.description || 'Contact for pricing'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyBlock
                  palette={palette}
                  text={`This business hasn't added ${isRestaurant ? 'menu' : 'service'} details yet. Contact them to ask.`}
                />
              )}
            </GlowCard>
          </AnimatedSection>
        </View>
        <View onLayout={rememberSection('reviews')} style={styles.sectionWrap}>
          <AnimatedSection index={2} canAnimate={canAnimate} canPressAnimate={canPressAnimate}>
            <GlowCard contentStyle={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {reviewsLoading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={palette.primary} />
                  <Text style={styles.mutedText}>Loading reviews…</Text>
                </View>
              )}
              {reviewsError && (
                <View>
                  <Text style={{ color: palette.danger || theme.colors.danger }}>
                    {reviewsError}
                  </Text>
                  <MotionTouchable
                    accessibilityRole="button"
                    onPress={() => refreshMarketplace().catch(() => {})}
                    style={styles.retryButton}
                  >
                    <Text style={{ color: palette.primary, fontWeight: '700' }}>Retry</Text>
                  </MotionTouchable>
                </View>
              )}
              <ReviewSummary
                palette={palette}
                rating={reviewStats.average}
                count={reviewStats.count}
                distribution={reviewStats.distribution}
              />
              {session && (!currentUserReview || editingReviewId) ? (
                reviewForm
              ) : !session ? (
                <MotionTouchable
                  accessibilityRole="button"
                  accessibilityLabel="Sign in to publish a review"
                  onPress={() => navigation.navigate('Welcome')}
                  style={[reviewStyles.signIn, { borderColor: palette.border }]}
                >
                  <Text style={{ color: palette.primary, fontWeight: '800' }}>
                    Sign in to leave a review
                  </Text>
                </MotionTouchable>
              ) : null}
              {providerReviews.length ? (
                providerReviews.map((review, index) => (
                  <ReviewCard
                    key={review.id || index}
                    palette={palette}
                    review={review}
                    onEdit={
                      String(review.userId) === String(session?.user?.id)
                        ? () => {
                            setEditingReviewId(review.id);
                            setReviewRating(review.rating);
                            setReviewComment(review.text || '');
                          }
                        : undefined
                    }
                  />
                ))
              ) : !reviewsLoading && !reviewsError ? (
                <EmptyBlock palette={palette} text="No reviews yet. Be the first to review." />
              ) : null}
            </GlowCard>
          </AnimatedSection>
        </View>
        <View onLayout={rememberSection('photos')} style={styles.sectionWrap}>
          <AnimatedSection index={3} canAnimate={canAnimate} canPressAnimate={canPressAnimate}>
            <GlowCard contentStyle={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <PhotoGallery
                palette={palette}
                photos={galleryPhotos}
                onPressPhoto={(index) => setSelectedPhotoIndex(index)}
              />
            </GlowCard>
          </AnimatedSection>
        </View>
        <View style={styles.reportSection}>
          <GlowButton
            accessibilityRole="button"
            accessibilityLabel="Report incorrect provider information"
            variant="ghost"
            label="Report listing"
            leftIcon={<Flag size={17} color={palette.text2} />}
            buttonStyle={styles.reportListingButton}
            onPress={() => setReportOpen(true)}
          />
        </View>
      </ScrollView>
      {!isPlace && !bookingOpen && (
        <View
          testID="provider-sticky-action-bar"
          style={[styles.stickyActionBar, { paddingBottom: insets.bottom }]}
        >
          <GlassView pointerEvents="none" intensity={48} style={StyleSheet.absoluteFill} />
          <View style={styles.stickyActionRow}>
            {!isPlace && (
              <View style={styles.stickyActionSlot}>
                <GlowButton
                  testID="btn-request-quote"
                  accessibilityRole="button"
                  accessibilityLabel="Request a Quote"
                  variant="secondary"
                  label="Quote"
                  stretch
                  buttonStyle={styles.stickyButton}
                  disabled={!whatsappNumber}
                  onPress={() => quoteSheetRef.current?.present()}
                />
              </View>
            )}
            {!isPlace && (
              <View style={styles.stickyActionSlot}>
                <GlowButton
                  testID="btn-book-provider"
                  accessibilityRole="button"
                  accessibilityLabel="Book this provider"
                  variant="primary"
                  label="Request booking"
                  stretch
                  sweepOnMount
                  status={bookingButtonStatus}
                  buttonStyle={styles.stickyButton}
                  onPress={() => {
                    if (!session) return navigation.navigate('Welcome');
                    setBookingDate(futureDate(1));
                    setBookingTime('');
                    setBookingValidationError('');
                    setLateNightConfirmationKey(null);
                    setBookingOpen(true);
                  }}
                />
              </View>
            )}
          </View>
        </View>
      )}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.photoViewer}>
          {selectedPhotoIndex !== null && galleryPhotos[selectedPhotoIndex] ? (
            <Image
              source={{ uri: galleryPhotos[selectedPhotoIndex] }}
              resizeMode="contain"
              style={styles.photoViewerImage}
            />
          ) : null}
          <View style={styles.photoViewerClose}>
            <GlowIconButton
              accessibilityRole="button"
              accessibilityLabel="Close photo viewer"
              icon={<X size={22} color={theme.colors.textPrimary} />}
              size={48}
              variant="secondary"
              onPress={() => setSelectedPhotoIndex(null)}
            />
          </View>
          {selectedPhotoIndex !== null && selectedPhotoIndex > 0 && (
            <View style={styles.photoViewerPrevious}>
              <GlowIconButton
                accessibilityRole="button"
                accessibilityLabel="Previous photo"
                icon={<ArrowLeft size={20} color={theme.colors.textPrimary} />}
                size={48}
                variant="secondary"
                onPress={() => setSelectedPhotoIndex((index) => Math.max(0, index - 1))}
              />
            </View>
          )}
          {selectedPhotoIndex !== null && selectedPhotoIndex < galleryPhotos.length - 1 && (
            <View style={styles.photoViewerNext}>
              <GlowIconButton
                accessibilityRole="button"
                accessibilityLabel="Next photo"
                icon={<ArrowRight size={20} color={theme.colors.textPrimary} />}
                size={48}
                variant="secondary"
                onPress={() =>
                  setSelectedPhotoIndex((index) => Math.min(galleryPhotos.length - 1, index + 1))
                }
              />
            </View>
          )}
        </View>
      </Modal>
      {!isPlace && (
        <BottomSheetModal
          enableDynamicSizing={false}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          ref={quoteSheetRef}
          index={0}
          snapPoints={quoteSnapPoints}
          enablePanDownToClose
          backgroundComponent={({ style }) => (
            <GlassView
              intensity={54}
              style={[style, { borderColor: palette.border, backgroundColor: palette.surface }]}
            />
          )}
          handleIndicatorStyle={{ backgroundColor: palette.muted }}
          backdropComponent={renderBackdrop}
        >
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.sheet,
            { flexGrow: 1, paddingBottom: Math.max(34, insets.bottom + 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={[styles.sheetTitle, { color: palette.text }]}>Request a Quote</Text>
          <Text style={{ color: palette.text2 }}>
            Opens a WhatsApp chat with {provider.name}. We can&apos;t confirm delivery.
          </Text>
          <BottomSheetTextInput
            style={[
              styles.input,
              {
                borderColor: palette.border,
                color: palette.text,
                backgroundColor: palette.background,
              },
            ]}
            placeholder={`Hi ${provider.name}, I'd like a quote for...`}
            placeholderTextColor={palette.muted}
            value={quoteMessage}
            onChangeText={setQuoteMessage}
            multiline
          />
          <AsyncGlowButton
            testID="btn-send-quote"
            variant="primary"
            label="Send via WhatsApp"
            stretch
            disabled={quoteBusy}
            status={quoteBusy ? 'loading' : undefined}
            buttonStyle={[
              styles.primary,
              {
                flex: 0,
                alignSelf: 'stretch',
                marginTop: 4,
                backgroundColor: palette.primary,
              },
            ]}
            onPress={sendQuote}
          />
        </BottomSheetScrollView>
        </BottomSheetModal>
      )}
      <Modal
        visible={reportOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportOpen(false)}
      >
        <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
          <GlassView
            intensity={48}
            style={[
              styles.bookingSheetScroll,
              styles.report,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <ScrollView
              style={{ maxHeight: '100%' }}
              contentContainerStyle={styles.bookingSheet}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.reportHead}>
                <Text style={[styles.sheetTitle, { color: palette.text }]}>
                  Report incorrect information
                </Text>
                <MotionTouchable
                  testID="btn-close-report"
                  accessibilityRole="button"
                  accessibilityLabel="Close report form"
                  onPress={() => setReportOpen(false)}
                >
                  <X size={22} color={palette.text2} />
                </MotionTouchable>
              </View>
              <AppTextInput
                testID="input-provider-report-details"
                accessibilityLabel="Incorrect information details"
                style={[styles.input, { borderColor: palette.border, color: palette.text }]}
                multiline
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Incorrect phone, address, business closed..."
                placeholderTextColor={palette.muted}
              />
              <GlowButton
                testID="btn-submit-provider-report"
                variant="primary"
                label="Submit report"
                stretch
                disabled={!reportDetails.trim()}
                buttonStyle={[styles.primary, { backgroundColor: palette.primary }]}
                onPress={() => {
                  void submitReport();
                }}
              />
            </ScrollView>
          </GlassView>
        </View>
      </Modal>
      {!isPlace && (
        <Modal
          visible={bookingOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setBookingOpen(false)}
        >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.overlay,
            {
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingTop: insets.top,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <GlassView
            intensity={48}
            style={[
              styles.bookingSheetScroll,
              styles.bookingFormSheet,
              styles.report,
              {
                width: '100%',
                maxHeight: '100%',
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <ScrollView
              style={{ flex: 1, minHeight: 0, width: '100%' }}
              contentContainerStyle={[styles.bookingSheet, { flexGrow: 1, paddingBottom: 24 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={styles.reportHead}>
                <Text style={[styles.sheetTitle, { color: palette.text }]}>Request a booking</Text>
                <MotionTouchable
                  testID="btn-close-booking"
                  accessibilityRole="button"
                  accessibilityLabel="Close booking form"
                  onPress={() => setBookingOpen(false)}
                >
                  <X size={22} color={palette.text2} />
                </MotionTouchable>
              </View>
              <Text style={{ color: palette.text2 }}>
                Choose a preferred time. The business must confirm it.
              </Text>
              <Text style={{ color: palette.text2, fontSize: 12, marginTop: 4 }}>
                Dates and times use UK local time.
              </Text>
              {provider.services?.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 14 }}
                >
                  {provider.services.map((service) => (
                    <MotionTouchable
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedService === service.id }}
                      key={service.id}
                      onPress={() => setSelectedService(service.id)}
                      style={[
                        styles.serviceChoice,
                        {
                          borderColor:
                            selectedService === service.id ? palette.primary : palette.border,
                          backgroundColor:
                            selectedService === service.id
                              ? palette.primarySoft
                              : palette.background,
                        },
                      ]}
                    >
                      <Text style={{ color: palette.text, fontWeight: '700' }}>{service.name}</Text>
                    </MotionTouchable>
                  ))}
                </ScrollView>
              )}
              <Text style={[styles.quickLabel, { color: palette.text2 }]}>Suggested dates</Text>
              <View style={styles.quickRow}>
                {[
                  [1, 'Tomorrow'],
                  [3, 'In 3 days'],
                  [7, 'In one week'],
                ].map(([days, label]) => (
                  <MotionTouchable
                    accessibilityRole="button"
                    accessibilityState={{ selected: bookingDate === futureDate(days) }}
                    key={days}
                    onPress={() => updateBookingDate(futureDate(days))}
                    style={[
                      styles.quickChoice,
                      {
                        borderColor:
                          bookingDate === futureDate(days) ? palette.primary : palette.border,
                        backgroundColor:
                          bookingDate === futureDate(days)
                            ? palette.primarySoft
                            : palette.background,
                      },
                    ]}
                  >
                    <Text style={{ color: palette.text, fontWeight: '700' }}>{label}</Text>
                  </MotionTouchable>
                ))}
              </View>
              <Text style={[styles.quickLabel, { color: palette.text2 }]}>Suggested times</Text>
              {availabilityLoading ? (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                >
                  <ActivityIndicator size="small" color={palette.primary} />
                  <Text style={{ color: palette.text2, fontSize: 12 }}>Checking availability…</Text>
                </View>
              ) : availabilityError ? (
                <Text
                  style={{
                    color: palette.danger || theme.colors.danger,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  Availability could not be checked. The business will confirm your request.
                </Text>
              ) : bookedTimes.length > 0 ? (
                <Text style={{ color: palette.text2, fontSize: 12, marginBottom: 8 }}>
                  Greyed times are already booked.
                </Text>
              ) : null}
              <View style={styles.quickRow}>
                {['09:00', '12:00', '15:00', '18:00'].map((time) => (
                  <MotionTouchable
                    accessibilityRole="button"
                    disabled={bookedTimes.includes(time)}
                    accessibilityState={{ selected: bookingTime === time }}
                    accessibilityLabel={
                      bookedTimes.includes(time) ? `${time}, already booked` : time
                    }
                    key={time}
                    onPress={() => updateBookingTime(time)}
                    style={[
                      styles.quickChoice,
                      {
                        borderColor: bookingTime === time ? palette.primary : palette.border,
                        backgroundColor:
                          bookingTime === time ? palette.primarySoft : palette.background,
                        ...(bookedTimes.includes(time) ? { opacity: 0.4 } : {}),
                      },
                    ]}
                  >
                    <Text style={{ color: palette.text, fontWeight: '700' }}>
                      {formatBookingTime(time)}
                    </Text>
                  </MotionTouchable>
                ))}
              </View>
              <View style={styles.dateRow}>
                {Platform.OS === 'web' ? (
                  <>
                    <AppTextInput
                      accessibilityLabel="Booking date in year month day format"
                      value={bookingDate}
                      onChangeText={updateBookingDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.dateInput,
                        { color: palette.text, borderColor: palette.border },
                      ]}
                    />
                    <AppTextInput
                      accessibilityLabel="Booking time in 24 hour format"
                      value={bookingTime}
                      onChangeText={updateBookingTime}
                      placeholder="HH:MM"
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.dateInput,
                        { color: palette.text, borderColor: palette.border },
                      ]}
                    />
                  </>
                ) : (
                  <>
                    <MotionTouchable
                      accessibilityRole="button"
                      accessibilityLabel="Choose booking date"
                      onPress={() => setBookingPicker('date')}
                      style={[
                        styles.dateInput,
                        { borderColor: palette.border, justifyContent: 'center' },
                      ]}
                    >
                      <Text style={{ color: bookingDate ? palette.text : palette.muted }}>
                        {formatDate(bookingDate) || 'Choose date'}
                      </Text>
                    </MotionTouchable>
                    <MotionTouchable
                      accessibilityRole="button"
                      accessibilityLabel="Choose booking time"
                      onPress={() => setBookingPicker('time')}
                      style={[
                        styles.dateInput,
                        { borderColor: palette.border, justifyContent: 'center' },
                      ]}
                    >
                      <Text style={{ color: bookingTime ? palette.text : palette.muted }}>
                        {formatBookingTime(bookingTime) || 'Choose time'}
                      </Text>
                    </MotionTouchable>
                  </>
                )}
              </View>
              {bookingPicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  mode={bookingPicker}
                  value={
                    bookingPicker === 'date'
                      ? parseLocalDate(bookingDate || futureDate(1))
                      : parseLocalDateTime(bookingDate || futureDate(1), bookingTime || '09:00')
                  }
                  minimumDate={
                    bookingPicker === 'date' ? parseLocalDate(getUkLocalDateTime().date) : undefined
                  }
                  minimumTime={
                    bookingPicker === 'time' && bookingDate === getUkLocalDateTime().date
                      ? parseLocalDateTime(bookingDate, getUkLocalDateTime().time)
                      : undefined
                  }
                  display={Platform.OS === 'ios' ? 'compact' : 'default'}
                  onChange={onBookingPickerChange}
                />
              )}
              <AppTextInput
                accessibilityLabel="Booking notes"
                maxLength={1000}
                style={[styles.input, { borderColor: palette.border, color: palette.text }]}
                multiline
                value={bookingNotes}
                onChangeText={setBookingNotes}
                placeholder="What do you need help with?"
                placeholderTextColor={palette.muted}
              />
              {selectedTimeBooked && (
                <Text style={{ color: palette.danger || theme.colors.danger, marginTop: 6 }}>
                  This time is already booked. Choose a different time.
                </Text>
              )}
              {bookingValidationError ? (
                <Text
                  accessibilityRole="alert"
                  style={{
                    color: palette.danger || theme.colors.danger,
                    marginTop: 8,
                  }}
                >
                  {bookingValidationError}
                </Text>
              ) : null}
              {lateNightConfirmationKey === `${bookingDate}T${bookingTime}` ? (
                <Text accessibilityRole="alert" style={{ color: palette.text2, marginTop: 8 }}>
                  This business has no opening hours. This is a late-night request; press “Confirm
                  late-night time” to continue.
                </Text>
              ) : null}
              <GlowButton
                testID="btn-request-booking"
                accessibilityRole="button"
                accessibilityLabel={
                  lateNightConfirmationKey === `${bookingDate}T${bookingTime}`
                    ? 'Confirm late-night time'
                    : 'Request booking'
                }
                variant="primary"
                label={
                  lateNightConfirmationKey === `${bookingDate}T${bookingTime}`
                    ? 'Confirm late-night time'
                    : 'Request booking'
                }
                size="lg"
                stretch
                status={bookingButtonStatus}
                disabled={bookingBusy || !bookingDate || !bookingTime || selectedTimeBooked}
                buttonStyle={[
                  styles.primary,
                  {
                    backgroundColor: palette.primary,
                    opacity:
                      bookingBusy || !bookingDate || !bookingTime || selectedTimeBooked ? 0.55 : 1,
                  },
                ]}
                onPress={submitBooking}
              />
            </ScrollView>
          </GlassView>
        </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  detailContent: { width: '100%', paddingBottom: 24 },
  page: { flex: 1 },
  body: { width: '100%', maxWidth: 840, alignSelf: 'center', paddingHorizontal: 16 },
  stickyTabs: {
    zIndex: 5,
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
  },
  sectionWrap: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sectionContent: { gap: 14, padding: 18 },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  sectionBody: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22 },
  subsection: { gap: 10 },
  subsectionTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
  mutedText: { color: theme.colors.textSecondary, fontSize: 13 },
  readMoreButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  readMoreText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  hoursRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  hoursToday: { backgroundColor: theme.colors.primaryDeep },
  hoursDay: { color: theme.colors.textSecondary, fontSize: 13 },
  hoursTime: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' },
  hoursTodayText: { color: theme.colors.primary, fontWeight: '700' },
  serviceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceChip: {
    minWidth: 112,
    maxWidth: '100%',
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 3,
  },
  serviceName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
  serviceDescription: { color: theme.colors.textSecondary, fontSize: 11 },
  businessFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  businessFact: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  businessFactText: { color: theme.colors.textSecondary, fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  reportSection: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reportListingButton: {
    minHeight: 48,
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    gap: 8,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  stickyActionBar: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary,
  },
  stickyActionRow: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stickyActionSlot: { flex: 1, minWidth: 0 },
  stickyButton: { minHeight: 52, width: '100%' },
  photoViewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  photoViewerImage: { width: '100%', height: '100%' },
  photoViewerClose: { position: 'absolute', top: 16, right: 16 },
  photoViewerPrevious: { position: 'absolute', left: 16, top: '50%' },
  photoViewerNext: { position: 'absolute', right: 16, top: '50%' },
  primary: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  secondary: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  sheet: { padding: 20, paddingBottom: 34 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginVertical: 16,
    textAlignVertical: 'top',
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  report: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  bookingSheetScroll: { flexGrow: 0, maxHeight: '92%' },
  bookingFormSheet: { height: '92%', maxHeight: '100%' },
  bookingSheet: { paddingBottom: 24 },
  reportHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 12 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 7 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  quickAction: { flex: 1, alignItems: 'center', gap: 7, minWidth: 0 },
  quickActionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  quickChoice: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  dateRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dateInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12 },
  serviceChoice: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 8,
  },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
});
