import { createContext, useContext, useState } from 'react';
import type { ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

const LockContext = createContext<(locked: boolean) => void>(() => {});

/**
 * The app's scrolling body. Keeps the focused input above the keyboard (edge-to-edge Android doesn't
 * resize for it), and a child can pause it: on Android a vertical ScrollView takes over any vertical
 * drag (pinch included), so a map inside it locks scrolling while a finger is on it.
 */
export function LockableScrollView(props: ScrollViewProps) {
  const [locked, setLocked] = useState(false);
  return (
    <LockContext.Provider value={setLocked}>
      <KeyboardAwareScrollView bottomOffset={24} {...props} scrollEnabled={!locked && props.scrollEnabled !== false} />
    </LockContext.Provider>
  );
}

/** Touch handlers that pause the nearest LockableScrollView while this view is being touched. */
export function useScrollLock() {
  const lock = useContext(LockContext);
  return {
    onTouchStart: () => lock(true),
    onTouchEnd: () => lock(false),
    onTouchCancel: () => lock(false),
  };
}
