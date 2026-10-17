import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Chip, FeedbackList, Input, Screen, Subtitle } from '../components/ui';
import { evaluateEmail } from '../logic/feedback';
import { recordSession } from '../logic/progress';
import { useProgress } from '../store/ProgressContext';

const KINDS = ['Correo', 'Slack / Teams', 'LinkedIn'];

export default function WritingScreen() {
  const { update } = useProgress();
  const [kind, setKind] = useState(KINDS[0]);
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState(null);
  const started = useRef(Date.now());

  const evaluate = () => {
    const fb = evaluateEmail(text);
    setFeedback(fb);
    update((s) =>
      recordSession(s, {
        mode: 'writing', score: fb.score, total: 10, xp: fb.score * 2,
        durationSec: Math.round((Date.now() - started.current) / 1000),
      }),
    );
  };

  const again = () => {
    setFeedback(null);
    started.current = Date.now();
  };

  return (
    <Screen>
      <Body muted>
        Escribe un mensaje profesional en inglés y revisamos el saludo, el cierre, la cortesía y los
        errores más comunes de hispanohablantes.
      </Body>
      <Subtitle>¿Qué vas a escribir?</Subtitle>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {KINDS.map((k) => (
          <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <Input
        multiline
        value={text}
        onChangeText={(t) => {
          setText(t);
          if (feedback) setFeedback(null);
        }}
        placeholder={'Hi Sarah,\n\nI hope you are doing well...'}
        autoCapitalize="sentences"
      />
      {!feedback ? (
        <Button title="Revisar mi mensaje" disabled={!text.trim()} onPress={evaluate} />
      ) : (
        <>
          <FeedbackList feedback={feedback} />
          <Body muted style={{ textAlign: 'center' }}>+{feedback.score * 2} XP · Edita el texto y vuelve a revisarlo</Body>
          <Button title="Escribir otro" variant="secondary" onPress={() => { setText(''); again(); }} />
          <Button title="Volver al inicio" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
