import React, { useEffect, useState } from 'react';
import { Alert as NativeAlert, Modal, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import Text from './AppText';
import { useChodhiQTheme } from '../context/ThemeContext';
import GlowButton from '../../components/ui/GlowButton';
import GlassView from './GlassView';
import { showButtonToast } from '../lib/buttonToast';

let showDialog;
export const AppAlert = {
  /**
   * @param {string} title
   * @param {string} [message]
   * @param {Array<{text: string, style?: 'cancel' | 'destructive' | 'ghost', onPress?: () => void}>} [buttons]
   * @param {object} [options]
   */
  alert(title, message, buttons = [{ text: 'Got it' }], options = {}) {
    const confirmation = String(message || title || '').trim().toLowerCase();
    if (confirmation === 'removed from saved' || confirmation.startsWith('removed from saved ')) {
      showButtonToast('Removed from saved');
      return;
    }
    if (confirmation === 'saved' || confirmation.startsWith('saved on your phone')) {
      showButtonToast('Saved');
      return;
    }
    if (showDialog)
      showDialog({
        title,
        message,
        buttons: buttons.length ? buttons : [{ text: 'Got it' }],
        options,
      });
    else NativeAlert.alert(title, message, buttons, options);
  },
};

export function AppDialogProvider({ children }) {
  const { palette } = useChodhiQTheme();
  const [dialog, setDialog] = useState(null);
  useEffect(() => {
    showDialog = setDialog;
    return () => {
      showDialog = undefined;
    };
  }, []);
  const dismiss = () => {
    if (dialog?.options.cancelable === false) return;
    setDialog(null);
    dialog?.options.onDismiss?.();
  };
  return (
    <>
      {children}
      <Modal transparent visible={!!dialog} animationType="fade" onRequestClose={dismiss}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: '#001B1866',
          }}
        >
          <GlassView
            accessibilityViewIsModal
            intensity={48}
            style={{
              width: '100%',
              maxWidth: 400,
              padding: 24,
              borderRadius: 24,
              backgroundColor: palette.surface,
              borderColor: palette.primary,
              gap: 16,
            }}
          >
            <View
              style={{
                backgroundColor: palette.primarySoft,
                borderRadius: 16,
                padding: 12,
                alignSelf: 'flex-start',
              }}
            >
              <CircleAlert size={26} color={palette.primary} />
            </View>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 21, fontWeight: '700', color: palette.text }}
            >
              {dialog?.title}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 23, color: palette.text2 }}>
              {dialog?.message}
            </Text>
            {dialog?.buttons.map((button, index) => (
              <GlowButton
                key={index}
                label={button.text || 'Got it'}
                variant={
                  button.style === 'cancel'
                    ? 'secondary'
                    : button.style === 'ghost'
                      ? 'ghost'
                      : button.style === 'destructive'
                        ? 'danger'
                        : 'primary'
                }
                size="md"
                stretch
                onPress={() => {
                  setDialog(null);
                  button.onPress?.();
                }}
              />
            ))}
          </GlassView>
        </View>
      </Modal>
    </>
  );
}
