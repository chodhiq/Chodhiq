import ScrollView from '../components/KeyboardAwareScrollView';
import { AppAlert as Alert } from '../components/AppDialog';
import { MotionModal as Modal } from '../components/Motion';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppTextInput from '../components/AppTextInput';
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  Briefcase,
  CalendarDays,
  Clock3,
  Flag,
  Languages,
  MessageCircle,
  Star,
  Tag,
  X,
} from 'lucide-react-native';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';
import {
  DetailSectionHeader,
  EmptyBlock,
  InfoChip,
  PhotoGallery,
  ProviderActions,
  ProviderHero,
  ProviderIdentity,
  ProviderMapPreview,
  ProviderTabs,
  ProviderVerified,
  ReviewCard,
  ReviewSummary,
} from '../components/ProviderDetailComponents';
import { getUkLocalDateTime } from '../data/bookingValidation';
import { toWhatsAppNumber } from '../lib/phone';

const priceLabel = (value) => (value ? '£'.repeat(value) : null);
const futureDate = (days) => {
  const currentDate = getUkLocalDateTime().date;
  const [year, month, day] = currentDate.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
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
    addReview,
    editReview,
    session,
  } = useAppState();
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const provider = providers.find((item) => item.id === id);
  const saved = provider ? savedIds.includes(provider.id) : false;
  const [tab, setTab] = useState('Overview');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingPicker, setBookingPicker] = useState(null);
  const quoteSheetRef = useRef(null);
  const quoteSnapPoints = useMemo(() => ['48%'], []);
  const renderBackdrop = useCallback(
    (props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
    [],
  );
  useEffect(() => {
    if (provider) recordProviderView(id);
  }, [id, provider, recordProviderView]);
  if (!provider)
    return (
      <SafeAreaView style={[styles.error, { backgroundColor: palette.background }]}>
        <Text style={[styles.errorTitle, { color: palette.text }]}>
          Unable to load this business.
        </Text>
        <TouchableOpacity
          style={[styles.primary, { backgroundColor: palette.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: palette.dark ? '#081B2C' : '#FFFFFF', fontWeight: '800' }}>
            Go back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  const providerReviews = (reviews || []).filter((review) => review.providerId === provider.id);
  const isRestaurant = /restaurant|food|cater|bakery|grocery/i.test(provider.category || '');
  const hasMapCoordinates =
    Number.isFinite(provider.baseLatitude) && Number.isFinite(provider.baseLongitude);
  const preciseDirectionsUrl = hasMapCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${provider.baseLatitude},${provider.baseLongitude}`)}`
    : provider.googlePlaceId
      ? `https://www.google.com/maps/dir/?api=1&destination_place_id=${encodeURIComponent(provider.googlePlaceId)}`
      : provider.googleMapsUrl?.includes('/dir/')
        ? provider.googleMapsUrl
        : null;
  const directionsUrl = preciseDirectionsUrl || provider.googleMapsSearchUrl || null;
  const directionsLabel = preciseDirectionsUrl ? 'Directions' : 'Search on Google Maps';
  const shareProvider = () =>
    Share.share({
      message: `${provider.name} — ${provider.category} in ${provider.baseCity}. Find them on ChodhiQ.${provider.website ? ` ${provider.website}` : ''}`,
    });
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
    if (!session) {
      Alert.alert('Sign in required', 'Please sign in before requesting a quote.', [
        { text: 'Cancel' },
        { text: 'Sign in', onPress: () => navigation.navigate('Welcome') },
      ]);
      return;
    }
    const number = toWhatsAppNumber(provider.whatsapp || provider.phone);
    if (!number)
      return Alert.alert('Contact unavailable', 'This business has no valid WhatsApp number.');
    const message =
      quoteMessage || `Hi ${provider.name}, I found you on ChodhiQ and I'd like a quote.`;
    try {
      await Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(message)}`);
    } catch (error) {
      Alert.alert('WhatsApp could not be opened', error.message || 'Please try again.');
      return;
    }
    try {
      await addQuoteRequest({ providerId: provider.id, providerName: provider.name, message });
      quoteSheetRef.current?.dismiss();
    } catch (error) {
      Alert.alert(
        'WhatsApp opened',
        `We can't confirm delivery. Check your WhatsApp chat. This request could not be saved in ChodhiQ: ${error.message || 'Please try again.'}`,
      );
    }
  };
  const submitReport = async () => {
    try {
      await reportProvider(provider.id, 'incorrect_information', reportDetails.trim());
      setReportOpen(false);
      setReportDetails('');
      Alert.alert('Report submitted', 'Thank you. We will review this listing.');
    } catch (error) {
      Alert.alert('Could not submit report', error.message);
    }
  };
  const submitReview = async () => {
    setReviewBusy(true);
    try {
      if (editingReviewId) {
        await editReview(editingReviewId, { rating: reviewRating, comment: reviewComment });
      } else {
        await addReview({ providerId: provider.id, rating: reviewRating, comment: reviewComment });
      }
      setReviewRating(0);
      setReviewComment('');
      setEditingReviewId(null);

      Alert.alert(
        editingReviewId ? 'Review updated' : 'Review published',
        editingReviewId
          ? 'Your changes are now included in this provider’s reviews.'
          : 'Your rating is now included in this provider’s score.',
      );
    } catch (error) {
      Alert.alert('Could not publish review', error.message);
    } finally {
      setReviewBusy(false);
    }
  };
  const submitBooking = async () => {
    setBookingBusy(true);
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

      Alert.alert('Booking requested', `${provider.name} will confirm or suggest another time.`);
    } catch (error) {
      Alert.alert('Could not request booking', error.message);
    } finally {
      setBookingBusy(false);
    }
  };
  const onBookingPickerChange = (event, selected) => {
    if (event.type === 'dismissed') {
      setBookingPicker(null);
      return;
    }
    if (selected) {
      if (bookingPicker === 'date') setBookingDate(formatLocalDate(selected));
      else setBookingTime(formatLocalTime(selected));
    }
    if (Platform.OS !== 'ios' || event.type === 'set') setBookingPicker(null);
  };
  const actions = [
    {
      label: 'Call',
      disabled: !toWhatsAppNumber(provider.phone),
      onPress: () => Linking.openURL(`tel:+${toWhatsAppNumber(provider.phone)}`),
    },
    {
      label: directionsLabel,
      disabled: !directionsUrl,
      onPress: () => directionsUrl && Linking.openURL(directionsUrl),
    },
    {
      label: 'Website',
      disabled: !provider.website,
      onPress: () => {
        try {
          return Linking.openURL(validateHttpsUrl(provider.website));
        } catch {
          return Alert.alert(
            'Website unavailable',
            'This provider website is not a valid secure URL.',
          );
        }
      },
    },
    { label: 'Save', active: saved, onPress: saveProvider },
  ].filter((action) => !action.disabled);
  const photos = provider.portfolio || [];
  const info = [];
  const todayHours = Array.isArray(provider.openingHours)
    ? provider.openingHours.find((item) => item.day_of_week === new Date().getDay())
    : null;
  if (todayHours)
    info.push({
      title: 'Opening today',
      value: todayHours.is_closed
        ? 'Closed'
        : `${String(todayHours.open_time || '').slice(0, 5)}–${String(todayHours.close_time || '').slice(0, 5)}`,
      Icon: Clock3,
    });
  if (provider.priceRange)
    info.push({ title: 'Price range', value: priceLabel(provider.priceRange), Icon: Tag });
  if (provider.languages?.length)
    info.push({ title: 'Languages', value: provider.languages.join(', '), Icon: Languages });
  if (provider.serviceAreas?.length)
    info.push({ title: 'Service area', value: provider.serviceAreas.join(', '), Icon: Briefcase });

  const overview = (
    <>
      {provider.description?.trim() ? (
        <>
          <DetailSectionHeader palette={palette} title="About" />
          <Text style={[styles.about, { color: palette.text2 }]}>{provider.description}</Text>
        </>
      ) : null}
      {Number.isFinite(provider.baseLatitude) && Number.isFinite(provider.baseLongitude) ? (
        <ProviderMapPreview palette={palette} onPress={() => navigation.navigate('Map')} />
      ) : null}
      {info.length > 0 && (
        <View style={styles.infoGrid}>
          {info.map((item) => (
            <InfoChip key={item.title} palette={palette} {...item} />
          ))}
        </View>
      )}
      {photos.length ? (
        <>
          <DetailSectionHeader palette={palette} title="Photos" onPress={() => setTab('Photos')} />
          <PhotoGallery palette={palette} photos={photos} />
        </>
      ) : null}
      <DetailSectionHeader palette={palette} title="Reviews" onPress={() => setTab('Reviews')} />
      <ReviewSummary
        palette={palette}
        rating={provider.rating}
        count={providerReviews.length || provider.reviewCount}
      />
      {providerReviews.slice(0, 1).map((review, index) => (
        <ReviewCard
          key={review.id || index}
          palette={palette}
          review={review}
          onEdit={
            review.userId === session?.user?.id
              ? () => {
                  setEditingReviewId(review.id);
                  setReviewRating(review.rating);
                  setReviewComment(review.text || '');
                  setTab('Reviews');
                }
              : undefined
          }
        />
      ))}
    </>
  );
  const reviewForm = (
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
          <TouchableOpacity
            accessibilityRole="button"
            key={value}
            accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
            onPress={() => setReviewRating(value)}
          >
            <Star
              size={30}
              color={palette.saffron}
              fill={value <= reviewRating ? palette.saffron : 'transparent'}
            />
          </TouchableOpacity>
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
      <TouchableOpacity
        disabled={reviewBusy || !reviewRating || !reviewComment.trim()}
        onPress={submitReview}
        style={[
          styles.primary,
          { backgroundColor: palette.primary },
          (reviewBusy || !reviewRating || !reviewComment.trim()) && { opacity: 0.45 },
        ]}
      >
        <Text style={{ color: palette.dark ? '#081B2C' : '#FFFFFF', fontWeight: '800' }}>
          {reviewBusy ? 'Saving…' : editingReviewId ? 'Save changes' : 'Publish review'}
        </Text>
      </TouchableOpacity>
      {editingReviewId && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            setEditingReviewId(null);
            setReviewRating(0);
            setReviewComment('');
          }}
          style={{ paddingTop: 11 }}
        >
          <Text style={{ color: palette.text2, textAlign: 'center' }}>Cancel edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  const content =
    tab === 'Overview' ? (
      overview
    ) : tab === 'Photos' ? (
      <>
        <DetailSectionHeader palette={palette} title="Photos" />
        <PhotoGallery palette={palette} photos={photos} />
      </>
    ) : tab === 'Reviews' ? (
      <>
        <DetailSectionHeader palette={palette} title="Reviews" />
        {session ? (
          reviewForm
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Welcome')}
            style={[reviewStyles.signIn, { borderColor: palette.border }]}
          >
            <Text style={{ color: palette.primary, fontWeight: '800' }}>
              Sign in to leave a review
            </Text>
          </TouchableOpacity>
        )}
        <ReviewSummary
          palette={palette}
          rating={provider.rating}
          count={providerReviews.length || provider.reviewCount}
        />
        {providerReviews.length ? (
          providerReviews.map((review, index) => (
            <ReviewCard
              key={review.id || index}
              palette={palette}
              review={review}
              onEdit={
                review.userId === session?.user?.id
                  ? () => {
                      setEditingReviewId(review.id);
                      setReviewRating(review.rating);
                      setReviewComment(review.text || '');
                    }
                  : undefined
              }
            />
          ))
        ) : (
          <EmptyBlock palette={palette} text="No reviews yet. Be the first to review." />
        )}
      </>
    ) : tab === 'Offers' ? (
      <>
        <DetailSectionHeader palette={palette} title="Active Offers" />
        <EmptyBlock
          palette={palette}
          text="There are no active offers right now. Check back later."
        />
      </>
    ) : (
      <>
        <DetailSectionHeader palette={palette} title={isRestaurant ? 'Menu' : 'Services'} />
        {provider.services?.length ? (
          provider.services.map((service) => (
            <InfoChip
              key={service.id}
              palette={palette}
              title={service.name}
              value={
                service.starting_price
                  ? `From £${service.starting_price}`
                  : service.description || 'Contact for pricing'
              }
              Icon={Briefcase}
            />
          ))
        ) : (
          <EmptyBlock
            palette={palette}
            text={`This business hasn't added ${isRestaurant ? 'menu' : 'service'} details yet. Contact them to ask.`}
          />
        )}
      </>
    );

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.detailContent, { paddingBottom: 32 + insets.bottom }]}
      >
        <ProviderHero
          provider={provider}
          palette={palette}
          saved={saved}
          onBack={() => navigation.goBack()}
          onShare={shareProvider}
          onSave={saveProvider}
        />
        <ProviderIdentity provider={provider} palette={palette} />
        <View style={styles.body}>
          <ProviderActions palette={palette} items={actions} />
          {provider.isVerified && <ProviderVerified palette={palette} />}
          <ProviderTabs
            palette={palette}
            value={tab}
            onChange={setTab}
            isRestaurant={isRestaurant}
          />
          {content}
          <View style={styles.footerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Report incorrect provider information"
              onPress={() => (session ? setBookingOpen(true) : navigation.navigate('Welcome'))}
              style={[styles.primary, { backgroundColor: palette.primary }]}
            >
              <CalendarDays size={18} color={palette.dark ? '#081B2C' : '#FFFFFF'} />
              <Text style={{ color: palette.dark ? '#081B2C' : '#FFFFFF', fontWeight: '800' }}>
                Book
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!provider.whatsapp && !provider.phone}
              onPress={() => quoteSheetRef.current?.present()}
              style={[
                styles.secondary,
                { borderColor: palette.border },
                !provider.whatsapp && !provider.phone && { opacity: 0.4 },
              ]}
            >
              <MessageCircle size={17} color={palette.text2} />
              <Text style={{ color: palette.text2, fontWeight: '700' }}>Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Report incorrect provider information"
              onPress={() => setReportOpen(true)}
              style={[styles.secondary, { borderColor: palette.border }]}
            >
              <Flag size={17} color={palette.text2} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <BottomSheetModal
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        ref={quoteSheetRef}
        index={0}
        snapPoints={quoteSnapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: palette.surface }}
        handleIndicatorStyle={{ backgroundColor: palette.muted }}
        backdropComponent={renderBackdrop}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          style={{ flex: 1 }}
        >
          <BottomSheetScrollView
            contentContainerStyle={[
              styles.sheet,
              { paddingBottom: Math.max(34, insets.bottom + 24) },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.sheetTitle, { color: palette.text }]}>Request a Quote</Text>
            <Text style={{ color: palette.text2 }}>
              Opens a WhatsApp chat with {provider.name}. We can't confirm delivery.
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
            <TouchableOpacity
              style={[styles.primary, { backgroundColor: palette.primary }]}
              onPress={sendQuote}
            >
              <Text style={{ color: palette.dark ? '#081B2C' : '#FFFFFF', fontWeight: '800' }}>
                Send via WhatsApp
              </Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
        </KeyboardAvoidingView>
      </BottomSheetModal>
      <Modal
        visible={reportOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportOpen(false)}
      >
        <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
          <ScrollView
            style={styles.bookingSheetScroll}
            contentContainerStyle={[
              styles.report,
              styles.bookingSheet,
              { backgroundColor: palette.surface },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.reportHead}>
              <Text style={[styles.sheetTitle, { color: palette.text }]}>
                Report incorrect information
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close report form"
                onPress={() => setReportOpen(false)}
              >
                <X size={22} color={palette.text2} />
              </TouchableOpacity>
            </View>
            <AppTextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              multiline
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="Incorrect phone, address, business closed..."
              placeholderTextColor={palette.muted}
            />
            <TouchableOpacity
              style={[styles.primary, { backgroundColor: palette.primary }]}
              onPress={submitReport}
            >
              <Text style={{ color: palette.dark ? '#081B2C' : '#FFFFFF', fontWeight: '800' }}>
                Submit report
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
      <Modal
        visible={bookingOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.overlay, { justifyContent: 'center' }]}
        >
          <ScrollView
            style={{ maxHeight: '92%', width: '100%' }}
            contentContainerStyle={[styles.report, { backgroundColor: palette.surface }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.reportHead}>
              <Text style={[styles.sheetTitle, { color: palette.text }]}>Request a booking</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close booking form"
                onPress={() => setBookingOpen(false)}
              >
                <X size={22} color={palette.text2} />
              </TouchableOpacity>
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
                  <TouchableOpacity
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
                          selectedService === service.id ? palette.primarySoft : palette.background,
                      },
                    ]}
                  >
                    <Text style={{ color: palette.text, fontWeight: '700' }}>{service.name}</Text>
                  </TouchableOpacity>
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
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: bookingDate === futureDate(days) }}
                  key={days}
                  onPress={() => setBookingDate(futureDate(days))}
                  style={[
                    styles.quickChoice,
                    {
                      borderColor:
                        bookingDate === futureDate(days) ? palette.primary : palette.border,
                      backgroundColor:
                        bookingDate === futureDate(days) ? palette.primarySoft : palette.background,
                    },
                  ]}
                >
                  <Text style={{ color: palette.text, fontWeight: '700' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.quickLabel, { color: palette.text2 }]}>Suggested times</Text>
            <View style={styles.quickRow}>
              {['09:00', '12:00', '15:00', '18:00'].map((time) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: bookingTime === time }}
                  key={time}
                  onPress={() => setBookingTime(time)}
                  style={[
                    styles.quickChoice,
                    {
                      borderColor: bookingTime === time ? palette.primary : palette.border,
                      backgroundColor:
                        bookingTime === time ? palette.primarySoft : palette.background,
                    },
                  ]}
                >
                  <Text style={{ color: palette.text, fontWeight: '700' }}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dateRow}>
              {Platform.OS === 'web' ? (
                <>
                  <AppTextInput
                    accessibilityLabel="Booking date in year month day format"
                    value={bookingDate}
                    onChangeText={setBookingDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={palette.muted}
                    style={[styles.dateInput, { color: palette.text, borderColor: palette.border }]}
                  />
                  <AppTextInput
                    accessibilityLabel="Booking time in 24 hour format"
                    value={bookingTime}
                    onChangeText={setBookingTime}
                    placeholder="HH:MM"
                    placeholderTextColor={palette.muted}
                    style={[styles.dateInput, { color: palette.text, borderColor: palette.border }]}
                  />
                </>
              ) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Choose booking date"
                    onPress={() => setBookingPicker('date')}
                    style={[
                      styles.dateInput,
                      { borderColor: palette.border, justifyContent: 'center' },
                    ]}
                  >
                    <Text style={{ color: bookingDate ? palette.text : palette.muted }}>
                      {bookingDate || 'Choose date'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Choose booking time"
                    onPress={() => setBookingPicker('time')}
                    style={[
                      styles.dateInput,
                      { borderColor: palette.border, justifyContent: 'center' },
                    ]}
                  >
                    <Text style={{ color: bookingTime ? palette.text : palette.muted }}>
                      {bookingTime || 'Choose time'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            {bookingPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                mode={bookingPicker}
                value={
                  bookingPicker === 'date'
                    ? parseLocalDate(bookingDate || futureDate(1))
                    : parseLocalDateTime(bookingDate || futureDate(1), bookingTime)
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
            <TouchableOpacity
              accessibilityRole="button"
              disabled={bookingBusy || !bookingDate || !bookingTime}
              style={[
                styles.primary,
                {
                  backgroundColor: palette.primary,
                  opacity: bookingBusy || !bookingDate || !bookingTime ? 0.55 : 1,
                },
              ]}
              onPress={submitBooking}
            >
              <Text style={{ color: palette.dark ? '#081B2C' : '#FFFFFF', fontWeight: '800' }}>
                {bookingBusy ? 'Sending…' : 'Request booking'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  detailContent: { width: '100%', maxWidth: 840, alignSelf: 'center' },
  page: { flex: 1 },
  body: { paddingHorizontal: 16 },
  about: { fontSize: 14, lineHeight: 22 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  footerActions: { flexDirection: 'row', gap: 10, marginTop: 26 },
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' },
  report: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  bookingSheetScroll: { flexGrow: 0, maxHeight: '92%' },
  bookingSheet: { paddingBottom: 24 },
  reportHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 12 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 7 },
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
