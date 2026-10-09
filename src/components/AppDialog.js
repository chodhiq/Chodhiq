import React, { useEffect, useState } from 'react';
import { Alert as NativeAlert, Modal, Pressable, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import Text from './AppText';
import { useChodhiQTheme } from '../context/ThemeContext';

let showDialog;
export const AppAlert = {
  alert(title, message, buttons = [{ text: 'Got it' }], options = {}) {
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
          <View
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: 400,
              padding: 24,
              borderRadius: 24,
              backgroundColor: palette.surface,
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
              <Pressable
                key={index}
                accessibilityRole="button"
                onPress={() => {
                  setDialog(null);
                  button.onPress?.();
                }}
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'center',
                  backgroundColor: button.style === 'cancel' ? palette.surfaceAlt : palette.primary,
                }}
              >
                <Text
                  style={{
                    fontWeight: '700',
                    color: button.style === 'cancel' ? palette.text : palette.onPrimary,
                  }}
                >
                  {button.text || 'Got it'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}
